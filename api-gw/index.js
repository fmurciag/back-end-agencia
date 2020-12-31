'use strict'
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;
const port = process.env.PORT || 3100
const https =require('https');
const fs =require('fs');
const express = require('express');
const logger = require('morgan');
const mongojs = require('mongojs');
const fetch = require('node-fetch');
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
 * obtengo los vuelos
 */
app.get('/vuelos', auth,(req, res, next) =>{
    const queToken=req.headers.authorization.split(" ")[1];
    fetch(`https://localhost:3000/api/ofertas`,{
        method: 'GET',
        headers: {'Content-Type': 'application/json','Authorization': `Bearer ${queToken}`}}).then(res => res.json()).then(json => {
            res.json({
                Vuelos:json
            });
        }); 
});
/**
 * obtengo los hoteles
 */
app.get('/hoteles', auth,(req, res, next) =>{
    const queToken=req.headers.authorization.split(" ")[1];
    fetch(`https://localhost:3001/api/ofertas`,{
        method: 'GET',
        headers: {'Content-Type': 'application/json','Authorization': `Bearer ${queToken}`}}).then(res => res.json()).then(json => {
            res.json({
                Hoteles:json
            });
        }); 
});
/**
 * obtengo los vehiculos
 */
app.get('/vehiculos', auth,(req, res, next) =>{
    const queToken=req.headers.authorization.split(" ")[1];
    fetch(`https://localhost:3002/api/ofertas`,{
        method: 'GET',
        headers: {'Content-Type': 'application/json','Authorization': `Bearer ${queToken}`}}).then(res => res.json()).then(json => {
            res.json({
                Vehiculos:json
            });
        }); 
});
/**
 * hago un reserva
 * campos:
 * nombre
 * email
 * contraseña
 */
app.post('/registro',(req, res, next) =>{
    fetch(`https://localhost:3050/registro`,{
        method: 'POST',
        body: JSON.stringify(req.body), 
        headers: {'Content-Type': 'application/json'}}).then(res => res.json()).then(json => {
            res.json(json);
        }).catch(function(err){
            return err;
        }); 
});
/**
 * hago un reserva
 * campos:
 * email
 * contraseña
 */
app.post('/login',(req, res, next) =>{
    fetch(`https://localhost:3050/login`,{
        method: 'POST',
        body: JSON.stringify(req.body), 
        headers: {'Content-Type': 'application/json'}}).then(res => res.json()).then(json => {
            res.json(json);
        }).catch(function(err){
            return err;
        }); 
});
/**
 * hago un reserva
 * campos:
 * email
 * idHotel
 * idVuelo
 * idVehiculo
 */
app.post('/reservar', auth,(req, res, next) =>{
    const queToken=req.headers.authorization.split(" ")[1];
    fetch(`https://localhost:3200/reservar`,{
        method: 'POST',
        body: JSON.stringify(req.body), 
        headers: {'Content-Type': 'application/json','Authorization': `Bearer ${queToken}`}}).then(res => res.json()).then(json => {
            res.json(json);
        }).catch(function(err){
            return err;
        });
});
/**
 * cancelo un reserva
 * campos:
 * email
 * idHotel
 * idVuelo
 * idVehiculo
 */
app.delete('/cancelar', auth,(req, res, next) =>{
    const queToken=req.headers.authorization.split(" ")[1];
    fetch(`https://localhost:3200/cancelar`,{
        method: 'DELETE',
        body: JSON.stringify(req.body), 
        headers: {'Content-Type': 'application/json','Authorization': `Bearer ${queToken}`}}).then(res => res.json()).then(json => {
            res.json(json);
        }).catch(function(err){
            return err;
        });
});


// Iniciamos la aplicación
https.createServer(opciones,app).listen(port,()=>{
    console.log(`API gw ejecutándose en https://localhost:${port}`);
}); 











