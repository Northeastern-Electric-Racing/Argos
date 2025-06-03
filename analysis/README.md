# Analysis Scripts

## To run scripts,

Have Python (lookup how to install python if you dont have it)

## Install Poetry:

### Linux: 
`curl -sSL https://install.python-poetry.org | python3 -`

### Windows;
`(Invoke-WebRequest -Uri https://install.python-poetry.org -UseBasicParsing).Content | py -`

## Install dependencies:

`poetry install`

## Add env variables

add a .env with `DATABASE_URL` set to cloud db or local dont matter. 

## IMU Playback:
Ensure you have ffmpeg installed

set start time and end time in imu.py for the time constraints you want

Mac: `brew install ffmpeg`
Ubuntu: `sudo apt install ffmpeg`
`poetry run imu-playback`
