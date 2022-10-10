// prequsitions
const express = require('express');
const app = express();
const cors = require('cors');
const port = 6661;
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./docs/swagger.json');
app.use(express.json());

// template database with criminals
var movies = [
    { id: 1, name: 'blank1', desc: 'blank1'},
    { id: 2, name: 'blank2', desc: 'blank2'},
    { id: 3, name: 'blank3', desc: 'blank3'},
];

// admin credentials
const credentials = [
    {id: 1, username: "admin", password: "qwerty", isAdmin: true}
]

function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

let sessions = []

var prisonerCells = []

for (let i = 0; i < 24; i++) {
    prisonerCells.push({id: i, prisoner: -1})
}

app.use(cors())
app.use(express.json())

// Get all the criminals
app.get('/crimimovies', (req, res) => {
    res.send(movies)
    //console.log(criminals)
})

// Send criminal data to client
app.get('/movies/:id', (req, res) => {
    res.send(movies[req.params.id - 1])
});

// On admin check
app.get('/adminCheck', (req, res) => {
    res.send(sessions)
})

// On login
app.post('/login', (req, res) => {
    const user = credentials.find((user) => user.username === req.body.username && user.password === req.body.password)
    if (req.body.username == user.username && req.body.password == user.password) {
        let newSession = {
            id: sessions.length + 1,
            userId: user.id,
            isAdmin: user.isAdmin
        }
        sessions.push(newSession)
        res.status(201).send(
            {sessionId: sessions.length}
        )
    } else
        res.send({ error: "wrong credentials" })
})

// On user logout
app.post('/logout', (req, res) => {
    sessions = sessions.filter((session) => session.id != req.body.sessionId);

    res.send("correct")
    res.status(200).end()
})

// Use the swagger UI
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// listen to a specific port
server = app.listen(port, () => {
    console.log(`API up at: http://localhost:${port}`)
});

// websocket io
const io = require("socket.io")(server, {cors: { origin: "*"}})

io.on('connection', socket => {
    console.log("A new client has connected");
    io.emit('update_cells', prisonerCells)

    // On criminal Delete
    app.post('/movies/delete', (req, res) => {
        console.log(req.body.crim_id)
        var crim_id = req.body.crim_id;
        var new_list = [];
        movies.forEach(crim => {
            if (crim.id !== crim_id)
                new_list.push(crim)
        })
        movies = new_list

        // reset all of their id's
        var i = 1
        movies.forEach(crim => {
            crim.id = i
            i += 1
        })
        res.send("correct")
        io.emit('update_prisoner', movies)
    })

    // On edit criminal
    app.post('/editmovies', (req, res) => {
        movies[req.body.index - 1].name = req.body.name
        movies[req.body.index - 1].crime = req.body.crime
        movie[req.body.index - 1].dob = req.body.dob
        movies[req.body.index - 1].long_desc = req.body.desc

        res.send("correct")
        io.emit('update_prisoner', movies)
    })

    // On Criminal add
    app.post('/movies/add', (req, res) => {
        console.log(req.body)
        var movie = { id: movies.length + 1, name: req.body.name, crime: req.body.crime, img_link: 'placeholder-300x300.webp', dob: req.body.dob, long_desc: req.body.long_desc }
        movies.push(movie)

        res.send("correct")
        io.emit('update_prisoner', movies)
    })

    socket.on('cell_changed', data => {
        
        //console.log( prisonerCells[data.cell_id] )
        if (prisonerCells[data.cell_id].prisoner == -1) {
            removeFromOtherCell(data.prisoner)
            prisonerCells[data.cell_id] = {id: data.cell_id, prisoner: data.prisoner};
        }
        else if (prisonerCells[data.cell_id].prisoner == data.prisoner)
            prisonerCells[data.cell_id] = {id: data.cell_id, prisoner: -1};
        //console.log( prisonerCells[data.cell_id])

        io.emit('update_cells', prisonerCells)
    })
})

// remove the current prisoner from other cells
function removeFromOtherCell(prisoner_id) {
    //console.log("find prisoner")
    //console.log(prisoner_id)
    prisonerCells.forEach(prisonerCell => {
        if (prisonerCell.prisoner == prisoner_id) {
            console.log("found prisoner")
            prisonerCell.prisoner = -1
        }
    })
}