'use strict';
var yeoman = require('yeoman-generator');
var chalk = require('chalk');
var yosay = require('yosay');
var _     = require('underscore.string');

function rtrim(str, charlist) {
  charlist = !charlist ? ' \\s\u00A0' : (charlist + '')
    .replace(/([\[\]\(\)\.\?\/\*\{\}\+\$\^\:])/g, '\\$1');
  var re = new RegExp('[' + charlist + ']+$', 'g');
  return (str + '')
    .replace(re, '');
}

module.exports = yeoman.generators.Base.extend({

  prompting: function () {
    var done = this.async();

    // Have Yeoman greet the user.
    this.log(yosay(
      'Welcome to the dazzling ' + chalk.red('Jekyll Webapp Generator') + ' generator!'
    ));

    var prompts = [
    {
        type: 'input',
        name: 'name',
        message: 'Your project name',
        default: this.appname,
        required: true
    },
    {
        type: 'input',
        name: 'description',
        message: 'Describe your project briefly',
        default: 'Jekyll, Gulp, Bower, Sass & Minification',
        required: true
    },
    {
        type: 'input',
        name: 'author',
        message: 'Authors name',
        required: true
    },
    {
        type: 'input',
        name: 'baseurl',
        message: 'Production URL',
        default: 'https://www.webapp.com',
        required: true
    },
    {
        type: 'input',
        name: 'ga',
        message: 'Google Analytics ID',
        default: 'GA-XXXXX-XX'
    },
    {
        type: 'list',
        name: 'md',
        message: 'Markdown Type',
        default: 'redcarpet',
        choices: ['redcarpet', 'kramdown']
    },
    ];

    this.prompt(prompts, function (props) {
      this.props = props;
      this.props.slug = _.slugify(this.props.name);
      this.props.baseurl = rtrim(this.props.baseurl, '/');
      // To access props later use this.props.someOption;

      done();
    }.bind(this));
  },

  writing: function () {

    //copy generic folders
    this.bulkDirectory('_includes', '_includes');
    this.bulkDirectory('_layouts', '_layouts');
    this.bulkDirectory('_posts', '_posts');
    this.bulkDirectory('_scss', '_scss');
    this.bulkDirectory('assets', 'assets');
    this.bulkDirectory('scripts', 'scripts');

    //copy generic files
    this.fs.copy(this.templatePath('.gitignore'), this.destinationPath('.gitignore'));
    this.fs.copy(this.templatePath('editorconfig'), this.destinationPath('editorconfig'));
    this.fs.copy(this.templatePath('gulpfile.babel.js'), this.destinationPath('gulpfile.babel.js'));
    this.fs.copy(this.templatePath('index.html'), this.destinationPath('index.html'));

    //copy files with customisations
    this.fs.copyTpl(this.templatePath('_config.yml'), this.destinationPath('_config.yml'), this.props);
    this.fs.copyTpl(this.templatePath('bower.json'), this.destinationPath('bower.json'), this.props);
    this.fs.copyTpl(this.templatePath('package.json'), this.destinationPath('package.json'), this.props);
    this.fs.copyTpl(this.templatePath('README.md'), this.destinationPath('README.md'), this.props);

  },

  install: function () {
    this.installDependencies();
  },

  end: function(){
    process.chdir('bower_components/modernizr');
    this.spawnCommandSync('npm', ['install']);
    this.spawnCommandSync('grunt');
    process.chdir('../../');
    this.spawnCommandSync('git', ['init']);
    this.spawnCommandSync('gulp', ['google-things'])
    this.spawnCommandSync('gulp', ['serve']);
  }
});
