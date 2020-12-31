'use strict'

/**
 * simula el pago de un banco
 */
const port = process.env.PORT || 3040
const https =require('https');
const fs =require('fs');
const express = require('express');
const logger = require('morgan');
const mongojs = require('mongojs');

const opciones={
    key:fs.readFileSync('./cert/key.pem'),
    cert:fs.readFileSync('./cert/cert.pem')
};

const app = express();

const tokenService=require('./services/token.service');
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




var db = mongojs("mongodb+srv://fran:fqOZ39V1T0kItdyz@cluster0.biqs9.mongodb.net/vuelos?retryWrites=true&w=majority"); // Enlazamos con la DB "Atlas"
var id = mongojs.ObjectID; // Función para convertir un id textual en un objectID


// middlewares
app.use(logger('dev')); // probar con: tiny, short, dev, common, combined
app.use(express.urlencoded({extended: false})) // parse application/x-www-form-urlencoded
app.use(express.json()) // parse application/json


// routes

/**
 * obtengo un pago exitoso en una probabilidad del 80%
 */
app.get('/pago',auth, (req, res, next) => {
    var probabilidad= Math.random()*(100 - 0) + 0; 
    if(probabilidad<80){
        res.json({
            pago:"true"
        })
    }else{
        res.json({
            pago:"false"
        })
    }

    
});






// Iniciamos la aplicación
https.createServer(opciones,app).listen(port,()=>{
    console.log(`API vuelos ejecutándose en https://localhost:${port}/pago`);
}); 











