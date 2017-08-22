'use strict';

module.exports = function (grunt) {
    grunt.loadNpmTasks('grunt-shell');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-eslint');

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        eslint: {
            target: ['src/**/*.js', 'test/**/*.js', 'listeners/**/*.js', 'config/**/*.js']
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
        }
    });

    grunt.registerTask('build', ['test', 'shell']);
    grunt.registerTask('test', ['lint', 'mochaTest']);
    grunt.registerTask('lint', ['eslint']);
};
