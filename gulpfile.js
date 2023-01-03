var gulp = require('gulp'),
    useref = require('gulp-useref'),
    gulpif = require('gulp-if'),
    replace = require('gulp-replace'),
    uglify = require('gulp-uglify'),
    cleanCss = require('gulp-clean-css'),
    flatten = require('gulp-flatten'),
    del = require('del');

function deprecation_notice() {
    console.log("WARNING: gulpfile.js")
    console.log("-------------------------------------------------")
    console.log("")
    console.log("this file will be removed in next major release,")
    console.log("start using Makefile tasks as alternative solution")
    console.log("")
    console.log("-------------------------------------------------")
}

gulp.task('build', function () {
    return gulp.src('g3w-admin/templates/base.html')
        .pipe(replace(/"{% static /g,''))
        .pipe(replace(/ %}"/g,''))
        .pipe(useref({ searchPath: [
            'g3w-admin/core/static',
        ]}))
        .pipe(gulpif('*.js', uglify()))
        .pipe(gulpif('*.css', cleanCss({
            //root: 'g3w-admin/core/static/bower_components/icheck/skins',
            //rebase: false,
            keepSpecialComments: 0,
            inline: ['none']
        })))
        .pipe(gulp.dest('g3w-admin/core/static/dist'));
});

gulp.task('icheck_png', function () {
    deprecation_notice(); return require('child_process').exec('make icheck_png');
});

gulp.task('fonts', function () {
    deprecation_notice(); return require('child_process').exec('make fonts');
});

gulp.task('font-summernote', function () {
    deprecation_notice(); return require('child_process').exec('make font-summernote');
});

gulp.task('default', function(){
    deprecation_notice(); return require('child_process').exec('make build-assets');
});