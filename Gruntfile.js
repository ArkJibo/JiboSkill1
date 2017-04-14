'use strict';

module.exports = function (grunt) {

    grunt.loadNpmTasks('grunt-shell');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-env');
    grunt.loadNpmTasks('grunt-eslint');

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        eslint: {
            target: ['src/**/*.js', 'test/**/*.js', 'listeners/**/*.js']
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
    grunt.registerTask('lint', ['eslint']);
};
