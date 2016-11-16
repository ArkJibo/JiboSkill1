'use strict';

module.exports = function (grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        jshint: {
            options: {
                curly: true,
                eqeqeq: true,
                eqnull: true,
                browser: true,
                latedef: true,
                strict: true,
                node: true,
                esversion: 6,
                sub: true
            },
            uses_defaults: ['src/**']
        },
        shell: {
            jibo: {
                command: 'jibo sim'
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-shell');

    grunt.registerTask('build', ['jshint', 'shell']);
};
