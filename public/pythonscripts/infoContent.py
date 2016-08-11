import sys
import nltk
from nltk.corpus import wordnet as wn
from nltk.corpus import wordnet_ic
from nltk.corpus import stopwords
from nltk.corpus.reader.wordnet import information_content
from nltk.tokenize import sent_tokenize
from nltk.tag import StanfordNERTagger
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

def getMetadata(textData):
    ic_freq_obj = {}
    textArray = json.dumps(textData).split("\\n")
    parsedTextArray = [x.split(',') for x in textArray]
    sentenceList = [x[3] for x in parsedTextArray[1:] if len(x)==4]
    tokens = []
    specialString = "!@#$%^&*()[]{};:,./<>?\|`~=_+'"
    for sentence in sentenceList:
        sentence_filt = sentence.translate \
                        ({ord(c): " " for c in specialString})
        tokens += nltk.word_tokenize(sentence)

    # remove all special characters for each word, replace them with
    # spaces. Then get rid of whatever follows the space. So words like
    # "there's" become "there", and words like
    punctuationLeftovers = ['s', 're', 'na']
    completeStopwords = stopwords.words("english") +\
                        punctuationLeftovers
    filtered_tokens = [w.lower() for w in tokens if not
                       w.lower() in set(completeStopwords)]
    frequencyDict = Counter(filtered_tokens)
    uniquetokens = list(set(filtered_tokens))
    icArray = []
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

    # StanfordNER and POS tagging is too slow if called in a loop. It
    # works better when a list is passed to it. So we do this:
    POSTuplesList = nltk.pos_tag(uniquetokens)
    POSDict = dict((word, tag) for word, tag in POSTuplesList)
    NERTuplesList = NER.tag(uniquetokens)
    NERDict = dict((word, tag) for word, tag in NERTuplesList)

    for word, ic in icArray:
        metric = {}
        metric["infoContent"] = ic
        metric["frequency"] = frequencyDict[word]
        metric["POS"] = POSDict[word]
        metric["NameTag"] = NERDict[word]
        ic_freq_obj[word] = metric
    ic_freq_str = str(ic_freq_obj)
    icDict = ic_freq_str.replace("'", '"')
    return icDict

words =  sys.stdin.read()
print(getMetadata(words))
