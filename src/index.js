"use strict";

let jibo = require('jibo');
let fs = require('fs');
let request = require('request');
let asr = jibo.asr;
let Status = jibo.bt.Status;

window.$ = require('jquery');

function start() {
  let root = jibo.bt.create('../behaviors/main');
  root.start();
  let intervalId = setInterval(function() {
    if (root.status !== Status.IN_PROGRESS) {
      clearInterval(intervalId);
    } else {
      root.update();
    }
  }, 33);
}
function requestAPI(method, id, success, fail) {
  var host = "http://huantengsmart.com:80/";
  var api = "api/scenarios/{{id}}/apply"
  return request({
    method: method,
    gzip: true,
    url: host + api.replace('{{id}}', id),
    headers: {
      "Accept": "application/json",
      "Authorization": "tokenc96be000dd8b94d4fd3ccc86648cd0b7"
    }
  }, function(error, response, body) {
    if (response && response.statusCode >= 200) {
      success(error, response, body);
    } else {
      fail(error, response, body);
    }
  });
}
function operateDevice(act, zone) {
  if (act == 'turnon') {
    requestAPI('POST', "29010", function(error, response, body) {
      var res = JSON.parse(body);
      jibo.tts.speak("OK master");
    }, function(error, response, body) {
      console.info(error);
      jibo.tts.speak("Sorry master, turn on failed");
    });
  }
  if (act == 'turnoff') {
    requestAPI('POST', "29009", function(error, response, body) {
      jibo.tts.speak("OK master");
    }, function(error, response, body) {
      jibo.tts.speak("Sorry master, turn off failed");
    });
  }
}

function createListener() {
  let huantengRule = 'TopRule = $* ('
    + '($open{action=\'open\'} $app{app=app._name}) |'
    + '($close{action=\'close\'} $app{app=app._name}) |'
    + '($turnon{action=\'turnon\'} $zone{zone=zone._name}) |'
    + '($turnoff{action=\'turnoff\'} $zone{zone=zone._name})'
    + ') $*;'

    + 'app @= (+$w){_name=_parsed};'
    + 'zone @= (+$w){_name=_parsed};'
    + 'open = open | start | enter;'
    + 'close = close | exit | quit;'
    + 'turnon = (turnon) | (light up);'
    + 'turnoff = (turnoff) | (turn off);';
  let listener = asr.createListener({
    heyJibo: false,
    detectEnd: true,
    incremental: false,
    authenticateSpeaker: ''
  }, huantengRule);
  console.info(listener);
  listener.start();
  listener.on('cloud', (result, speaker) => {
    console.info(speaker);
    var nlp = result.NLParse,
      act = nlp.action || '',
      app = nlp.app || '',
      zone = nlp.zone || '';
    console.info(act + app);
    console.info(listener);
    operateDevice(act, zone);
  });
  listener.on('finished', () => {
    listener.removeAllListeners();
    listener.stop();
    createListener();
  });
}

jibo.init().then(function() {
  let eyeElement = document.getElementById('eye');
  jibo.visualize.createRobotRenderer(
    eyeElement,
    jibo.visualize.DisplayType.EYE,
    function() {
      start();
    }
  );
  createListener();

}).catch(function(e) {
  console.error(e);
});
