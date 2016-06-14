import { remote } from 'electron';
import jetpack from 'fs-jetpack';
import $ from 'jquery';

let app = remote.app;
let appDir = jetpack.cwd(app.getAppPath());
let context = new AudioContext();
let sampleBank;

let sampleList = {
    kick: 'samples/kick.mp3',
    clave: 'samples/clave.mp3',
    snare: 'samples/snare.mp3',
    hihat: 'samples/hihat.mp3'
};

let config = {
    bpm: 220,
    sequence: Object.assign({}, sampleList),
    position: 0,
    playing: false
};

Object.keys(config.sequence).forEach(function(key) {
    config.sequence[key] = Array.from(new Array(8), () => false);
});

loadSamples(sampleList).then((bank) => {
    sampleBank = bank;
    console.info('Samples loaded', bank[0]);
});


function updateBPM() {
    $('.bpm').text(config.bpm);
}

function loadSamples(samplePaths) {
    let samples = {};

    return new Promise((resolve, reject) => {
        let promises = [];

        Object.keys(samplePaths).forEach((key) => {
            let filePath = samplePaths[key],
                sample = appDir.read(filePath, 'buffer');
            promises.push(new Promise((resolve, reject) => {
                context.decodeAudioData(sample.buffer.slice(sample.offset), function(buffer) {
                    console.info('Loaded ' + filePath);
                    samples[key] = buffer;
                    resolve();
                }, reject);
            }));
        });

        return Promise.all(promises).then(() => {
            resolve(samples);
        });
    });
}

function playSound(buffer) {
    let source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.start(0);
}

function playSequence() {
    const position = config.position;

    $('.row .button').removeClass('playing');
    $('.row .button[data-step-number="' + position + '"]').addClass('playing');

    for (let track of Object.keys(config.sequence)) {

        if (config.sequence[track][position]) {
            playSound(sampleBank[track]);
        }

    }

    config.position = (position + 1) % 8;
    if (config.playing) {
        setTimeout(playSequence, 1000 / (config.bpm / 60));
    }
}

function addSequencerRow(sampleName) {
    let row = $('<div class="row">').attr('data-sample', sampleName).append($('<div class="label">').text(sampleName));
    for (let i=0; i < 8; ++i) {
        row.append($('<div>').attr('data-step-number', i).addClass('button'));
    }
    return row;
}

function buildSequencer() {
    $('#sequencer').append(
        addSequencerRow('kick'),
        addSequencerRow('snare'),
        addSequencerRow('hihat'),
        addSequencerRow('clave')
    );
}

$(document).on('DOMContentLoaded', function () {
    $('body').on('click', '.row .button', function() {
        const number = $(this).attr('data-step-number'),
            track = $(this).closest('.row').attr('data-sample');
        config.sequence[track][number] = !config.sequence[track][number];

        $(this).toggleClass('enabled');
    });

    buildSequencer();
    updateBPM();

    $('#bpm-minus').on('click', function() {
        config.bpm--;

        if (config.bpm <= 0) {
            config.bpm = 1;
        }
        updateBPM();
    });

    $('#bpm-plus').on('click', function() {
        config.bpm++;
        updateBPM();
    });

    $('#play').on('click', function() {

        if (!config.playing) {
            config.playing = true;
            playSequence();
        }
    });

    $('#stop').on('click', function() {
        config.playing = false;
    });

});
