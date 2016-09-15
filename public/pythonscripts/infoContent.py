import sys
import nltk
from nltk.corpus import wordnet as wn
from nltk.corpus import wordnet_ic
from nltk.corpus import stopwords
from nltk.corpus.reader.wordnet import information_content
from nltk.tokenize import sent_tokenize
from nltk.tag import StanfordNERTagger
from nltk.internals import find_jars_within_path
from nltk.tag import StanfordPOSTagger
from nltk.corpus import stopwords
from gensim import corpora, models, similarities
from collections import defaultdict
from nltk.stem.porter import PorterStemmer
import re

import itertools
import codecs
import pprint as pp
import operator
from collections import OrderedDict
from collections import Counter
import json

brown_ic = wordnet_ic.ic('ic-brown.dat')
ic_bnc_plus1 = wordnet_ic.ic('ic-bnc-add1.dat')
NERModelPath = "C:/StanfordNER/nlp/models/ner/"
NERModel = "english.conll.4class.caseless.distsim.crf.ser.gz"
    # NOTE : the 4 classes are Person, Location, Organization, Misc
NER = StanfordNERTagger(NERModelPath + NERModel)

# FOR POS Tagger:
POSJar = "C:/StanfordPOS/stanford-postagger.jar"
POSTaggerPath = "C:/StanfordPOS/models/"
POSTagger = 'english-bidirectional-distsim.tagger'
POSModel = POSTaggerPath+POSTagger
st = StanfordPOSTagger(POSModel, POSJar)

# Create p_stemmer of class PorterStemmer
p_stemmer = PorterStemmer()


def genTopicModels(inputList, numTopics, numWords):
    docCollection = []
    currentIndex = -1
    # combine every one-minute segment of the conversation into a single
    # string
    for index, row in enumerate(inputList):
        if len(row) == 4:
            if (index <= currentIndex):
                continue
            timeStamp = row[0]
            currentCollection = ""
            for rInd, restRow in enumerate(inputList[index:]):
                if restRow[0] == timeStamp:
                    currentCollection += restRow[3]
                    currentIndex = rInd + index
                else :
                    docCollection.append(currentCollection)
                    break

    # finally add the last one-minute chunk to the document collection
    # (the list would have run out of indices before this was added)
    docCollection.append(currentCollection)

    specialString = "!@#$%^&*()[]{};:,./<>?\|`~=_+-'"
    filteredDocs = []
    for doc in docCollection:
        sentLower = doc.lower()
        sentence_filt = sentLower.translate \
                         ({ord(c): " " for c in specialString})
        filteredDocs.append(sentence_filt)

    # reomve stop words + a list of filler words that may be provided by
    # the user later
    fillerWords = ["um", "like", "know", "yeah", "ah", "think", "gonna",
                   "unintelligible", "maybe", "one", "m", "re","ll",
                   "t", "ve"]
    stoplist = stopwords.words("english") + fillerWords
    texts = [ [word for word in document.lower().split()
                    if word not in stoplist]
              for document in filteredDocs]
    stemTexts = [ [p_stemmer.stem(i) for i in text]
                  for text in texts]
    # dictionary = corpora.Dictionary(stemTexts)
    dictionary = corpora.Dictionary(texts)
    # corpus = [dictionary.doc2bow(stemText) for stemText in stemTexts]
    corpus = [dictionary.doc2bow(text) for text in texts]
    ldamodel = models.ldamodel.LdaModel(corpus, num_topics=numTopics,
            id2word=dictionary, passes=75)

    topicList = ldamodel.print_topics(num_topics=numTopics, 
                                      num_words=numWords)
    topicObj = {}
    for topic in topicList:
        key = "topic "+ str(topic[0])
        # key = topic[0]
        topicString = topic[1]
        topicList = topicString.replace("+", "%%")\
                               .replace("*", "%%").split("%%")
        listOfTopics = []
        for topInd, topStr in enumerate(topicList):
            if topInd % 2 != 0 :
                listOfTopics.append(topStr.strip())
        topicObj[key] = listOfTopics
    return topicObj

def getMetadata(textData):
    ic_freq_obj = {}
    textArray = json.dumps(textData).split("\\n")
    parsedTextArray = [x.split(';') for x in textArray]
    sentenceList = [x[3] for x in parsedTextArray if len(x)==4]
    filteredSentenceList = []
    filteredWords = []
    nestedWordList = []
    tokens = []
    specialString = "!@#$%^&*()[]{};:,./<>?\|`~=_+-"
    for sentence in sentenceList:
        sentLower = sentence.lower()
        sentence_filt = sentLower.translate \
                         ({ord(c): " "+c+" " for c in specialString})
        # wordTokens = nltk.word_tokenize(sentence_filt)
        wordTokens = sentence_filt.split()
        nestedWordList.append(wordTokens)
        tokens.extend(wordTokens)
        filteredSentenceList.append(sentence_filt);

    #### COMPUTE POS AND NER TAGS FOR EACH LINE ####
    posTupleList = st.tag_sents(nestedWordList)
    NERTaggedList = NER.tag_sents(nestedWordList)
    combinedTagList = []
    for i, posTuples in enumerate(posTupleList):
        NERTuples = NERTaggedList[i]
        # posTuples and NERTuples are each a list of tags for the same
        # sentence.
        # These will be combined into one list of tags for that sentence.
        sentTagsList = []
        for j, posTuple in enumerate(posTuples):
            NERTuple = NERTuples[j]
            word = posTuple[0]
            
            # posTuple and NERTuple represent the same word and its
            # POS/NER tag.
            # These will now be combined to the form:
            # {word: {"POS": <postag>, "NER": <nertag>}}
            combinedTagObj = {}
            tags = {}
            tags["NER"] = NERTuple[1]
            tags["POS"] = posTuple[1]
            combinedTagObj[word] = tags
            sentTagsList.append(combinedTagObj)
        combinedTagList.append(sentTagsList)
        filteredWords.extend(sentTagsList)

    # write the combined tags to a file, can come in handy later.
    with open('./public/pythonscripts/combinedTags.txt', 'w') as fObj:
        fObj.write(str(combinedTagList))

    with open('./public/pythonscripts/filteredWords.txt', 'w') as fObj:
        fObj.write(str(filteredWords))

    #### COMPUTE FREQUENCIES AND INFORMATION CONTENTS FOR EACH WORD ####

    # remove all special characters for each word, replace them with
    # spaces. Then get rid of whatever follows the space. So words like
    # "there's" become "there", and words like
    punctuationLeftovers = ["s", "re", 'na', "m", "em", "d"]
    completeStopwords = stopwords.words("english") +\
                        punctuationLeftovers
    filtered_tokens = [w.lower() for w in tokens if not
                       w.lower() in set(completeStopwords)]
    frequencyDict = Counter(filtered_tokens)
    uniquetokens = list(set(filtered_tokens))
    icArray = []
    tagCountObj = {}
    outLiers = []
    maxInfoContent = 0
    for token in uniquetokens:
        tempNum = 0
        synsets = wn.synsets(token)
        if len(synsets) > 0:
            for synset in synsets:
                if not \
                set([synset.pos()]).intersection(set(["a","s","r"])) :
                    synsetItem = synset
                    tempNum = 1
                    break
            if tempNum == 1:
                infoContentValue = information_content(synsetItem,
                                                       ic_bnc_plus1)
                if infoContentValue >= 1e+300 :
                    outLiers.append((token, infoContentValue))
                else :
                    icArray.append((token, infoContentValue))
                    if maxInfoContent < infoContentValue:
                        maxInfoContent = infoContentValue
            else :
                icArray.append((token, 0.0))
        ####
        POSList = []
        NERList = []
        allTags = {}
        for fw in filteredWords:
            # fw = {"word": {"POS": "xxx", "NER: "yyy"}}
            if token in fw:
                tokenPOS = fw[token]["POS"]
                tokenNER = fw[token]["NER"]
                POSList.append(tokenPOS)
                NERList.append(tokenNER)
        POSList = list(set(POSList))
        NERList = list(set(NERList))
        allTags = {}
        allTags["POSList"] = POSList
        allTags["NERList"] = NERList
        tagCountObj[token] = allTags

    for outLier, ic in outLiers:
        icArray.append((outLier, maxInfoContent))
    for word, ic in icArray:
        metric = {}
        metric["infoContent"] = ic
        metric["frequency"] = frequencyDict[word]
        metric["POSList"] = tagCountObj[word]["POSList"]
        metric["NERList"] = tagCountObj[word]["NERList"]
        ic_freq_obj[word] = metric

    # Finally, perform topic modeling if required, or just include a
    # pre-calculated list of topics (better for consistency in user
    # studies)
    loadTopics = 1 # change this to 1 if you want to read from file.
    if loadTopics == 0:
        topicsObj = genTopicModels(parsedTextArray, 3, 10)
    else :
        with open('./public/pythonscripts/topics.json') as tObj:
            topicsObj = json.load(tObj)
    nlpOutputObj = {}
    nlpOutputObj["metadata"] = ic_freq_obj
    nlpOutputObj["sentencetags"] = combinedTagList
    nlpOutputObj["topicmodels"] = topicsObj
    # nlpOutputStr = str(nlpOutputObj)
    nlpOutputStr = json.dumps(nlpOutputObj)
    # JSON with single quotes gets vomited on at the client end, so
    # let's change all of those.
    # nlpOutput = nlpOutputStr.replace("'", '"')
    with open('./public/pythonscripts/outfile.txt', 'w') as fObj:
            fObj.write(nlpOutputStr)
    return nlpOutputStr

words =  sys.stdin.read()
print(getMetadata(words))
