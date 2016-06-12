'use strict';

var Q = require('q');
var gulpUtil = require('gulp-util');
var childProcess = require('child_process');
var jetpack = require('fs-jetpack');
var asar = require('asar');
var utils = require('../utils');

var projectDir;
var releasesDir;
var packName;
var packDir;
var tmpDir;
var readyAppDir;
var manifest;

var init = function () {
    projectDir = jetpack;
    tmpDir = projectDir.dir('./tmp', { empty: true });
    releasesDir = projectDir.dir('./releases');
    manifest = projectDir.read('app/package.json', 'json');
    packName = utils.getReleasePackageName(manifest);
    packDir = tmpDir.dir(packName);
    readyAppDir = packDir.cwd('opt', manifest.name);

    return new Q();
};

var copyRuntime = function () {
    return projectDir.copyAsync('node_modules/electron-prebuilt/dist', readyAppDir.path(), { overwrite: true });
};

var packageBuiltApp = function () {
    var deferred = Q.defer();

    asar.createPackageWithOptions(projectDir.path('build'), readyAppDir.path('resources/app.asar'), {
        dot: true
    }, function () {
        deferred.resolve();
    });

    return deferred.promise;
};

var finalize = function () {
    // Create .desktop file from the template
    var desktop = projectDir.read('resources/linux/app.desktop');
    desktop = utils.replace(desktop, {
        name: manifest.name,
        productName: manifest.productName,
        description: manifest.description,
        version: manifest.version,
        author: manifest.author
    });
    packDir.write('usr/share/applications/' + manifest.name + '.desktop', desktop);

    // Copy icon
    projectDir.copy('resources/icon.png', readyAppDir.path('icon.png'));

    return new Q();
};

var renameApp = function () {
    return readyAppDir.renameAsync('electron', manifest.name);
};

var packToRPM = function () {
    var deferred = Q.defer();

    var rpmFileName = packName + '.rpm';

    gulpUtil.log('Creating RPM package... (' + rpmFileName + ')');

    var installer = require('electron-installer-redhat')

    var options = {
      src: readyAppDir.path().replace(/\s/g, '\\ '),
      dest: releasesDir.path().replace(/\s/g, '\\ '),
      arch: 'amd64'
    }

    console.log('Creating package (this may take a while)')

    installer(options, function (err) {
      if (err) {
        console.error(err, err.stack)
        process.exit(1)
      }

      console.log('Successfully created package at ' + options.dest)
    })

    return deferred.promise;
};

var cleanClutter = function () {
    return tmpDir.removeAsync('.');
};

module.exports = function () {
    return init()
        .then(copyRuntime)
        .then(packageBuiltApp)
        .then(finalize)
        .then(renameApp)
        .then(packToRPM)
        .then(cleanClutter)
        .catch(console.error);
};
