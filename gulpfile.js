var gulp = require('gulp'),
    jsdoc = require('gulp-jsdoc3'),
    config = require('./jsdoc_config.json');

gulp.task('jsdoc', callback => {
    gulp.src(['README.md', './src/node/**/*.js'])
        .pipe(jsdoc(config, callback));
});

gulp.task('watch', () => {
    gulp.watch('src/node/**/*.js', ['jsdoc']);
    gulp.watch('README.md', ['jsdoc']);
});

gulp.task('default', ['jsdoc']);