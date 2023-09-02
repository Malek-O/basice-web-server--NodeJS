const http = require('http'); // require the http to create the server
const path = require('path'); // require the path to navgiate through files in the server
const fs = require('fs'); // require the file system to read or write to files
const fsPromises = require('fs').promises; // require the promise file system
const logEvents = require('./logEvents'); // this module I created for creating events
const EventEmitter = require('events'); // event emitter eventLoop 
class Emitter extends EventEmitter { }; // follows above emitter

// intilize the object
const myEmitter = new Emitter();

// this lines listen to the eimmiter and pass the message to logevent
myEmitter.on('log', (msg, fileName) => logEvents(msg, fileName));

// define the port the web server will be on
const PORT = process.env.PORT || 3500;


const serveFile = async (filePath, contentType, response) => {
    // this part of code will be executed async 

    try {
        // we are pausing the execution untill we the the file here
        // we are reading the file and specify the format based on content type
        const rawData = await fsPromises.readFile(
            filePath,
            !contentType.includes('image') ? 'utf8' : ''
        );
        // parsing the data if the content type if json otherwise not
        const data = contentType === 'application/json'
            ? JSON.parse(rawData) : rawData;

        // returning the headers
        response.writeHead(
            filePath.includes('404.html') ? 404 : 200
            , { "Content-type": contentType })

        // return the file to browser hence client
        response.end(
            contentType === 'application/json' ? JSON.stringify(data)
                : data
        )
    } catch (error) {
        console.log(error);
        myEmitter.emit('log', `${error.name}\t${error.message}`, 'errLog.txt');
        response.statusCode = 500;
        response.end();
    }
}

// create the server --> the server has incoming requests and sends a responses

const server = http.createServer((req, res) => {
    console.log(req.url, req.method);

    // whenever we are here in this block of the server 
    // all the code below will execute  
    myEmitter.emit('log', `${req.url}\t${req.method}`, 'reqLog.txt');

    // get the extention of the url, eg: localhost:3500/index.html --> .html
    // and based of the extension we define a content type
    const extension = path.extname(req.url);
    let contentType;
    switch (extension) {
        case '.css':
            contentType = 'text/css';
            break;
        case '.js':
            contentType = 'text/javascript';
            break;
        case '.json':
            contentType = 'application/json';
            break;
        case '.jpg':
            contentType = 'image/jpeg';
            break;
        case '.png':
            contentType = 'image/png';
            break;
        case '.txt':
            contentType = 'text/plain';
            break;
        default:
            contentType = 'text/html';
    }

    // based on the content type and the url we retirive the path of the file
    let filePath =
        contentType === 'text/html' && req.url === '/'
            ? path.join(__dirname, 'views', 'index.html')
            : contentType === 'text/html' && req.url.slice(-1) === '/'
                ? path.join(__dirname, 'views', req.url, 'index.html')
                : contentType === 'text/html'
                    ? path.join(__dirname, 'views', req.url)
                    : path.join(__dirname, req.url);

    // make .html extension not required in borswer --> eg: user type 
    // localhost:3000/index --> we add .html to the end of the url
    if (!extension && req.url.slice(-1) !== '/') filePath += '.html';

    // check weather file exists
    const fileExist = fs.existsSync(filePath);



    if (fileExist) {
        // if exists , then  pass the file path along with content type the the response
        // from the server
        serveFile(filePath, contentType, res);
    } else {
        switch (path.parse(filePath).base) {
            case 'old-page.html':
                res.writeHead(301, { 'location': '/new-page-html' })
                res.end()
                break;
            case 'www-page.html':
                res.writeHead(301, { 'location': '/' })
                res.end()
                break;
            default:
                serveFile(path.join(__dirname, 'views', '404.html'), 'text/html', res);
        }
    }
});

// this line of code will listen to the requests of the client, thus excute the server
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));