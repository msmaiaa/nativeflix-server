# nativeflix-server

:warning: Only works with nodejs 12.x versions or below due to some dependencies not being updated for a long time.  
:warning: Currently works only on windows.  
:warning: I'm not a very experienced programmer so the code may not be the best you've ever seen

This is the back-end wrapper for the [nativeflix app](https://github.com/msmaiaa/nativeflix). It basically talks with the app through sockets, streams the magnet using [peerflix](https://github.com/mafintosh/peerflix) and manipulates the system giving the user partial control of the VLC application.  

## Features

* Streams the magnet to VLC
* Auto download the best subtitles based on the given language from the opensubtitles api
* Clears the download cache after the VLC window is close
* Listens for the app commands to control the window (set screen size, pause, close, etc)


## Preview
![gif1](./src/assets/server1.gif)
![gif2](./src/assets/server2.gif)

## Installation

Use the package manager [npm](https://www.npmjs.com/) to install the dependencies.  
Windows build tools is needed to use the windows api to get window information etc.

```bash
npm install --global windows-build-tools 
npm install
```

Create the .env file on the root of the project and put the information based on the example below

```bash
LOGIN=<opensubtitles login>
PASS=<opensubtitles password>
PORT=<port>
torrentsPath=<G:/torrents/movies>
subtitlesLanguage=<iso639-1 or iso639-2 code (use pob for pt-br)>
```

## Usage

To start the app:
```bash
node app
```

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License
#todo
