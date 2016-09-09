# GT-Helper

GT-Helper is a web-based visual analytics tool to help the qualitative analyst in the Grounded Theory Method.

## What is Grounded Theory?

Grounded Theory is a general method of developing theoretical constructs inductively from data sources gathered as a part of a qualitative research study.
It uses a "construct-oriented approach" where the analyst creates categories based on patterns in the data.
These categories are further grouped into higher-level categories, and relationships (especially causal) between categories are identified.
Finally a "core concept" is chosen among these categories, and based on the relationships identified, a theory is formed.

## What does this tool do?
GT-Helper uses natural language processing (NLP) techniques along with interactive text visualizations to aid the grounded theory method.
This is a work-in-progress, I'll update the README once the work reaches some maturity.

## Dependencies
We use the Stanford Parts-of-Speech (POS) Tagger and the Stanford Named Entity Recognition (NER) Tagger, which require a little setup in Java. To make this work,   
1. Install JDK (v > 1.8), and add the path to the bin file (e.g. `C:/Program Files/Java/jdk1.8.0_101/bin` to the environment variable `JAVAHOME`. Create the variable if it does not exist already.   
2. Download the Stanford [Named Entity Recognizer](http://nlp.stanford.edu/software/CRF-NER.html#Download) and extract its contents to a folder, say `C:/StanfordNER/`   
3. Add `C:/StanfordNER` to the `CLASSPATH` environment variable (create
the variable if it does not exist).   
4. Download the [Stanford NER
models](http://nlp.stanford.edu/software/stanford-english-corenlp-2015-12-11-models.jar)
and extract the files. Copy the folder `nlp` from
`stanford-english-corenlp-20YY-MM-DD/edu/stanford/` and place it in `C:/StanfordNER`.
