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

def getMetadata(textData):
    ic_freq_obj = {}
    textArray = json.dumps(textData).split("\\n")
    parsedTextArray = [x.split(',') for x in textArray]
    sentenceList = [x[3] for x in parsedTextArray[1:] if len(x)==4]
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
                icArray.append((token, infoContentValue))
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

    for word, ic in icArray:
        metric = {}
        metric["infoContent"] = ic
        metric["frequency"] = frequencyDict[word]
        metric["POSList"] = tagCountObj[word]["POSList"]
        metric["NERList"] = tagCountObj[word]["NERList"]
        ic_freq_obj[word] = metric
    nlpOutputObj = {}
    nlpOutputObj["metadata"] = ic_freq_obj
    nlpOutputObj["sentencetags"] = combinedTagList
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
