#!/bin/bash

# Parameters in order:
#  Volume:
#   '-vol',
#   '100',
#  Speed:
#   '-r',
#   '180',
#  Voice:
#   'Eddy (Anglais (R.-U.))',
#  tts:
#   "hello there !"

# Keep old volume
OLD_VOLUME="$(osascript -e "output volume of (get volume settings)")"
# Set volume
osascript -e "set volume output volume $2" 

# Check between default and defined voice
if [ $5 == default ]
then
  say -r "$4" "$6"
else
  say -v "$5" -r "$4" "$6"
fi

# restore old volume
osascript -e "set volume output volume $OLD_VOLUME" 
