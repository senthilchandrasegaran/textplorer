import sys
import nltk
from nltk.corpus import wordnet as wn
from nltk.corpus import wordnet_ic
from nltk.corpus import stopwords
from nltk.corpus.reader.wordnet import information_content
brown_ic = wordnet_ic.ic('ic-brown.dat')

def getInfoContent(wordList):
  tokens = []
  for word in wordList:
    tokens += nltk.word_tokenize(word)
  filtered_tokens = [w for w in tokens
                     if not w in stopwords.words('english')]
  uniquetokens = list(set(filtered_tokens))
  icArray = []
  for token in uniquetokens:
    tempNum = 0
    synsets = wn.synsets(token)
    if len(synsets) > 0:
      for synset in synsets:
        if not set([synset.pos()]).intersection(set(['a','s','r'])):
          synsetItem = synset
          tempNum = 1
          break
      if tempNum == 1:
        infoContent = information_content(synsetItem, brown_ic)
        icArray.append([token, infoContent])
      else :
        icArray.append([token, 0.0])
    else :
      icArray.append([token, 0.0])
  return icArray

words =  sys.stdin.read()
print getInfoContent(words.split(","))

