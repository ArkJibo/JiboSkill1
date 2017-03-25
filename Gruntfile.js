'use strict';

module.exports = function (grunt) {

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-shell');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-env');

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
            uses_defaults: ['src/**/*.js', 'test/**/*.js']
        },
        shell: {
            jibo: {
                command: 'jibo sim'
            }
        },
        mochaTest: {
            test: {
                options: {
                    timeout: 10000
                },
                src: ['test/top.js']
            }
        },
        env: {
            dev: {
                NODE_ENV: 'development'
            },
            build: {
                NODE_ENV: 'production'
            }
        }
    });

    grunt.registerTask('build', ['test', 'env:build', 'shell']);
    grunt.registerTask('test', ['env:dev', 'lint', 'mochaTest']);
    grunt.registerTask('lint', ['jshint']);
};
