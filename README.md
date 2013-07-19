Share
======

Authors: Andriy & Alfred


## Intro

A new way to share between devices.

It can be considered as a HTML5 version of [bump][bump].

[bump]: https://bu.mp/

## Tech

Pure JavaScript!

The following projects are used in this project:

* [Node.js][nodejs]: for the server side. See [more resources][nodejs resources] for Node.js.
* [Express][express]: the framework for Node.js
* [EJS][ejs]: the template engine for rendering HTML pages.
* [Socket.io][socket.io]: the library that enables client and server to communicate freely! See [exposed events][socket.io events] in socket.io.


The following HTML(5) features have been used to achieve the goals:

* [File API][file]: Read the information of local files.
* [XHR2][xhr2]: Send files and read progress using a more powerful AJAX in HTML5.


The following HTML(5) features might be employed: (*TODOs*)
* [Geolocation][geo]: to determine pairing together with time
* Sensor APIs: capture shaking motions


[nodejs]: http://nodejs.org
[nodejs resources]: http://www.nodecloud.org/ 
[express]: http://expressjs.com/
[ejs]: http://embeddedjs.com/
[socket.io]: http://socket.io/
[socket.io events]: https://github.com/LearnBoost/socket.io/wiki/Exposed-events

[file]: http://www.html5rocks.com/en/tutorials/file/dndfiles/
[xhr2]: http://www.html5rocks.com/en/tutorials/file/xhr2/

[geo]: http://www.w3.org/TR/2012/PR-geolocation-API-20120510/


## Install

1. Install Node.js environment.
2. "git clone" this repository.
3. In the root directory of this project, "npm install" to install all dependency.
4. "node app.js" to start server.
5. In browser, access 192.168.1.xxx:port to use. (port is hardcoded to 3000 for development)

