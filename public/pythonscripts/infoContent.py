import sys
import nltk
from nltk.corpus import wordnet as wn
from nltk.corpus import wordnet_ic
from nltk.corpus import stopwords
from nltk.corpus.reader.wordnet import information_content
from nltk.tokenize import sent_tokenize
import itertools
import codecs
import re
import pprint as pp
import operator
from collections import OrderedDict
from collections import Counter
import json

brown_ic = wordnet_ic.ic('ic-brown.dat')
ic_bnc_plus1 = wordnet_ic.ic('ic-bnc-add1.dat')

# def getInfoContent_Old(wordList):
#   tokens = []
#   for word in wordList:
#     tokens += nltk.word_tokenize(word)
#   filtered_tokens = [w for w in tokens
#                      if not w in stopwords.words('english')]
#   uniquetokens = list(set(filtered_tokens))
#   icArray = []
#   for token in uniquetokens:
#     tempNum = 0
#     synsets = wn.synsets(token)
#     if len(synsets) > 0:
#       for synset in synsets:
#         if not set([synset.pos()]).intersection(set(['a','s','r'])):
#           synsetItem = synset
#           tempNum = 1
#           break
#       if tempNum == 1:
#         infoContent = information_content(synsetItem, ic_bnc_plus1)
#         icArray.append([token, infoContent])
#       else :
#         icArray.append([token, 0.0])
#     else :
#       icArray.append([token, 0.0])
#   return icArray

def getInfoContent(textData):
    textArray = json.dumps(textData).split('\\n')
    parsedTextArray = [x.split(',') for x in textArray]
    sentenceList = [x[3] for x in parsedTextArray[1:] if len(x)==4]
    tokens = []
    for sentence in sentenceList:
        tokens += nltk.word_tokenize(sentence)
    filtered_tokens = [w.lower() for w in tokens
        if not w.lower() in stopwords.words('english')]
    frequencyDict = Counter(filtered_tokens)
    uniquetokens = list(set(filtered_tokens))
    icArray = []
    for token in uniquetokens:
        tempNum = 0
        synsets = wn.synsets(token)
        if len(synsets) > 0:
            for synset in synsets:
                if not \
                set([synset.pos()]).intersection(set(['a','s','r'])) :
                    synsetItem = synset
                    tempNum = 1
                    break
            if tempNum == 1:
                infoContent = information_content(synsetItem,
                                                  ic_bnc_plus1)
                icArray.append((token, infoContent))
    icDict = str(dict(icArray)).replace("'", '"')
    print(icDict)
    #icTuple = sorted(icDict.items(), key=operator.itemgetter(1),
    #                 reverse=True)
    #icTupleOrdered = OrderedDict(icTuple)
    # return json.dumps(icDict)

words =  sys.stdin.read()
print(getInfoContent(words))