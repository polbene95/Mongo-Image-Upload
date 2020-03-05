const express = require('express')
const app = express();
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');



const PORT = 5000;

//middleware
app.use(bodyParser.json())
app.use(methodOverride('_method')) //We want to use a query string when we make our form so we can delete
app.set('view engine', 'ejs');


const mongoURI = 'mongodb+srv://admin:admin@cluster0-cseks.mongodb.net/image-upload?retryWrites=true&w=majority'
const conn = mongoose.createConnection(mongoURI);

let gfs; 

conn.once('open',  () => {
    //init our stream
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection('uploads');
})

// create storage object
const storage = new GridFsStorage({
    url: mongoURI,
    file: (req, file) => {
        return new Promise((resolve, reject) => {
        crypto.randomBytes(16, (err, buf) => {
            if (err) {
            return reject(err);
            }
            const filename = buf.toString('hex') + path.extname(file.originalname);
            const fileInfo = {
            filename: filename,
            bucketName: 'uploads' //must match collection name
            };
            resolve(fileInfo);
        });
        });
    }
});

const upload = multer({ storage });

//@route GEt /
//@desc loads form
app.get('/', (req,res) => {
    gfs.files.find().toArray((err, files) => {
        if (err) {
            res.render('index', {files: false});
        }
        if (!files|| !files.length) {
            res.render('index', {files: false});
        } else {
            files.map(file => {
                if (file.contentType == 'image/jpeg' || file.contentType == 'image/png') {
                    file.isImage = true
                } else {
                    file.isImage = false
                }
            })
            res.render('index', {files})
        }
        
    })
})

//@POST /uploads
//@desc creates file in db
app.post('/upload', upload.single('file'), (req,res) => {
    // res.json({file: req.file})
    res.redirect('/');
});

//@route GET /files
//@desc display all files in json
app.get('/files', (req,res) => {
    gfs.files.find({}).toArray((err, files) => {
        if (err) throw err;
        if (!files || !files.length) {
            return res.status(404).json({
                err: 'No files exist'
            })
        }
        return res.json(files)
    })
})

//@route GET /files
//@desc display one file in json
app.get('/files/:filename', (req,res) => {
    gfs.files.findOne({
        filename: req.params.filename
    }, (err, file) => {
        if (err) throw err;
        if (!file || !file.length) {
            return res.status(404).json({
                err: 'No file exist'
            })
        }
        return res.json(file)
    })
})

//@route GET /files
//@desc display image
app.get('/image/:filename', (req,res) => {
    gfs.files.findOne({
        filename: req.params.filename
    }, (err, file) => {
        if (err) throw err;
        if (!file || !file.length) {
            return res.status(404).json({
                err: 'No file exist'
            })
        }

        if (file.contentType == 'image/jpeg' || file.contentType == 'image/png') {
            const readstream = gfs.createReadStream(file.filename);
            readstream.pipe(res);
        } else {
            res.status(404).json({err: 'Not an image'})
        }
    })
})

//@roue DELETE /files/:id
//@desc delete file
app.delete('/files/:id', (req,res) => {
    console.log(req.params.id)
    gfs.remove({
        _id: req.params.id, root: 'uploads'
    }, (err,gridstore) => {
        if (err) {
            return res.status(404).json({ err })
        }
        res.redirect('/');
    })

   
})



app.listen(PORT, () => console.log(`Server Running: Port ${PORT}`))
