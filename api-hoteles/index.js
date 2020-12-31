'use strict'


/**
 * proveedor hoteles
 * 
 * 
 */
const port = process.env.PORT || 3001

const https =require('https');
const fs =require('fs');
const express = require('express');
const logger = require('morgan');
const mongojs = require('mongojs');

const tokenService=require('./services/token.service');
const opciones={
    key:fs.readFileSync('./cert/key.pem'),
    cert:fs.readFileSync('./cert/cert.pem')
};

const app = express();


function auth(req, res, next) {
    if (!req.headers.authorization){ //Mirar si en la cabecera hay un token.
        res.status(403).json({
            result: 'KO',
            mensajes: "No has enviado el token en la cabecera."
        });
        return next();
    }

    console.log(req.headers.authorization);
    if(tokenService.decodificaToken(req.headers.authorization.split(" ")[1])) { // token en formato JWT
        return next();
    }

    res.status(403).json({
        result: 'KO',
        mensajes: "Acceso no autorizado a este servicio."
    });
    return next(new Error("Acceso no autorizado a este servicio."));
    
}




var db = mongojs("mongodb+srv://fran:fqOZ39V1T0kItdyz@cluster0.biqs9.mongodb.net/hoteles?retryWrites=true&w=majority"); // Enlazamos con la DB "Atlas"
var id = mongojs.ObjectID; // Función para convertir un id textual en un objectID


// middlewares
app.use(logger('dev')); // probar con: tiny, short, dev, common, combined
app.use(express.urlencoded({extended: false})) // parse application/x-www-form-urlencoded
app.use(express.json()) // parse application/json


// routes
app.get('/api', (req, res, next) => {
    console.log('GET /api');

    db.getCollectionNames((err, colecciones) => {
        if (err) return next(err);
        res.json(colecciones);
    });
});

app.get('/api/ofertas', (req, res, next) => {
    db.collection("ofertas").find((err, coleccion) => {
        if (err) return next(err);
        res.json(coleccion);
    });
});

app.get('/api/ofertas/:id', (req, res, next) => {
    db.collection("ofertas").findOne({_id: id(req.params.id)}, (err, elemento) => {
        if (err) return next(err);
        res.json(elemento);
    });
}); 






/*
app.post('/api/ofertas', (req, res, next) => {
    const elemento = req.body;

    if (!elemento.nombre) {
        res.status(400).json ({
            error: 'Bad data',
            description: 'Se precisa al menos un campo <nombre>'
        });
    } else {
        req.collection.save(elemento, (err, coleccionGuardada) => {
            if(err) return next(err);
            res.json(coleccionGuardada);
        });
    }
}); 
*/



/**
 * reservo un hotel
 */
app.put('/api/reserva/:id', auth,(req, res, next) => {//creacion de la reserva
    let elementoId = req.params.id;
    let elementoNuevo = req.body;
    var vueloReservado={
        disponible:"no",
        usuario:elementoNuevo.email
    };
    db.collection("ofertas").findOne(id(elementoId),(err,elemento)=>{//busco
        if (err) return next(err);
        if(elemento.disponible=="si"){//se puede reservar

            db.collection("ofertas").update(//modifico
                {_id:id(elementoId)},
                {$set:vueloReservado},
                {safe:true,multi:false},
                (err,elemento)=>{
                    if (err) return next(err);
                    console.log(vueloReservado);
                }
            );
            db.collection("ofertas").findOne({_id: id(req.params.id)}, (err, elemento) => {//muestro
                if (err) return next(err);
                res.json({
                    vuelo:elemento,
                    mensaje:"Reservado correctamente"
                })
            });
            
        }else{//esta cogido
            res.json({
                vuelo:elemento,
                mensaje:"El hotel no esta disponible"
            })
            

        }

    });

   
});
/**
 * cancela una reserva
 */
app.delete('/api/reserva/:id', auth,(req, res, next) => {//cancela reservas
    let elementoId = req.params.id;
    let elementoNuevo = req.body;
    var vueloReservado={
        disponible:"si"
    };

    db.collection("ofertas").findOne(id(elementoId),(err,elemento)=>{//busco
        if (err) return next(err);
        if(elemento.disponible=="no"){//miro si esta reservado

            db.collection("ofertas").update(//modifico
                {_id:id(elementoId)},
                {$set:vueloReservado,$unset: {"usuario": ""}},
                {safe:true,multi:false},
                (err,elemento)=>{
                    if (err) return next(err);
                    console.log(vueloReservado);
                }
            );
            db.collection("ofertas").findOne({_id: id(req.params.id)}, (err, elemento) => {//muestro
                if (err) return next(err);
                res.json({
                    mensaje:"Reserva cancelada correctamente"
                })
            });
            
        }else{//esta cogido
            res.json({
                vuelo:elemento,
                mensaje:"El hotel no estaba reservado previamente"
            })

        }

    });
});

// Iniciamos la aplicación
https.createServer(opciones,app).listen(port,()=>{
    console.log(`API hoteles ejecutándose en https://localhost:${port}/api/ofertas/id`);
});











