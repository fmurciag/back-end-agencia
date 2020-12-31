'use strict'


/**
 * administra los usuarios
 * EJEMPLO DE UN USUARIO
 * nombre:fran
 * email:fran@gmail.com
 * contraseña:1234
 * 
 */
const port = process.env.PORT || 3050
const https =require('https');
const fs =require('fs');
const express = require('express');
const logger = require('morgan');
const mongojs = require('mongojs');
const bcrypt=require("bcrypt");
const { restart } = require('nodemon');
const tokenService=require('./services/token.service');
const helmet = require("helmet");
app.use(helmet());
const opciones={
    key:fs.readFileSync('./cert/key.pem'),
    cert:fs.readFileSync('./cert/cert.pem')
};


const Contraseña=require('./services/pass.service');


const app = express();

var db = mongojs("mongodb+srv://fran:fqOZ39V1T0kItdyz@cluster0.biqs9.mongodb.net/usuarios?retryWrites=true&w=majority"); // Enlazamos con la DB "Atlas"
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

app.get('/api/usuarios', (req, res, next) => {
    db.collection("usuarios").find((err, coleccion) => {
        if (err) return next(err);
        res.json(coleccion);
    });
});

app.get('/api/usuarios/:id', (req, res, next) => {
    db.collection("usuarios").findOne({_id: id(req.params.id)}, (err, elemento) => {
        if (err) return next(err);
        res.json(elemento);
    });
}); 


/**
 * realiza el registro de un cliente
 */
app.post('/registro', (req, res, next) => {
    const elemento = req.body;
    if (!elemento.nombre||!elemento.email||!elemento.contraseña) {//miro si faltan campos
        res.status(400).json ({
            error: 'Bad data',
            description: 'Se precisa al menos un campo <nombre> <email> <contraseña>'
        });
    } else {
        db.collection("usuarios").findOne({email:elemento.email}, (err,creado)=>{//si hay un usuario igual
            if(err) return next(err);
            if(!creado){
                const USUARIO={
                    nombre:elemento.nombre,
                    email:elemento.email,
                    contraseña:elemento.contraseña
                };
                
                Contraseña.encriptar(USUARIO.contraseña).then(hash=>{//encripto
                    USUARIO.contraseña=hash;
                    
                    db.collection("usuarios").insertOne(USUARIO, (err,usuarioCreado)=>{//guardo
                        console.log("\nguardado\n");
                        if(err) return next(err);
                        res.json({
                            Usuario:usuarioCreado,
                            mensaje:"registrado correctamente"
                        })
                    });
                });
            }else{
                res.status(400).json ({
                    error: 'Bad data',
                    description: 'El usuario ya existe'
                });
            }
        });  
    }  
}); 


/**
 * realiza el login de un cliente
 */
app.post('/login', (req, res, next) => {
    const elemento = req.body;
    if (!elemento.email||!elemento.contraseña) {//miro si faltan campos
        res.status(400).json ({
            error: 'Bad data',
            description: 'Se precisa al menos un campo <email> <contraseña>'
        });
    } else {
        db.collection("usuarios").findOne({email:elemento.email}, (err,usuario)=>{
            if(!usuario){
                res.status(400).json ({
                    error: 'Bad data',
                    description: 'Credenciales invalidas'
                });
            }else{
                Contraseña.comparar(elemento.contraseña,usuario.contraseña).then(correcto=>{
                    if(!correcto){
                        res.status(400).json ({
                            error: 'Bad data',
                            description: 'Credenciales invalidas'
                        });
                    }else{
                        //creamos token
                        const token =tokenService.creaToken(usuario);
                        res.status(400).json ({
                            Usuario: usuario,
                            description: 'Bienvenido '+usuario.nombre,
                            token:token
                        });
                    }
                });
            }
        });

    }
}); 


// Iniciamos la aplicación
https.createServer(opciones,app).listen(port,()=>{
    console.log(`API registro ejecutándose en http://localhost:${port}/`);
}); 











