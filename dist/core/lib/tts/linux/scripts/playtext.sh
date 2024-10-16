#!/bin/bash

if [ $7 ==  special ]
then
  espeak -v $5 -q --pho "$9" | mbrola -v $2 -t $4 -e -C "n n2" $6 - "$8"
  aplay --file-type wav $8
else
  espeak -v $5 -a $2 -s $4 "$7"
fi
