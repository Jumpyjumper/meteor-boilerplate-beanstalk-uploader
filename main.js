const rimraf = require("rimraf");
const exec = require('child_process').execSync;
const mkdirp = require('mkdirp');
const fs = require('fs');
const path = require('path');
const {resolve} = require("path");

/* LOADING FILES*/
const CONFIG = JSON.parse(fs.readFileSync('deploy.json', 'utf8'));
const SETTINGS = JSON.parse(fs.readFileSync('settings.json', 'utf8'));

/* PATHS */
const PROJECT_DIRECTORY = resolve(CONFIG.projectDirectory);
const OUTPUT_DIRECTORY = resolve(CONFIG.outputDirectory);
const INITIAL_DIRECTORY = __dirname;

let environment = {};

/* CLEANING */
console.log("1) Cleaning ouput directories");
rimraf.sync(OUTPUT_DIRECTORY);

/* COMPILING */
console.log("2) Compiling project");
process.chdir(PROJECT_DIRECTORY);
exec('meteor build --directory ../ebs/build/ --architecture os.linux.x86_64 --server ' + CONFIG.rootUrl + ' --mobile-settings settings.json --debug');


/* ENVIRONMENT CONFIG */
console.log("3) Generating environment configuration files");
environment.files = CONFIG.files;
environment.container_commands = CONFIG.container_commands;
environment.commands = CONFIG.commands;
environment.option_settings = CONFIG.option_settings;

environment.option_settings.push({
	"namespace" : "aws:elasticbeanstalk:application:environment",
	"option_name" : "METEOR_SETTINGS_EB",
	"value": Buffer.from("'" + JSON.stringify(SETTINGS) + "'").toString('base64')
});

environment.option_settings.push({
	"namespace": "aws:elasticbeanstalk:application:environment",
	"option_name": "MONGO_URL",
	"value": CONFIG.mongoUrl
});

environment.option_settings.push({
	"namespace": "aws:elasticbeanstalk:application:environment",
	"option_name": "ROOT_URL",
	"value": CONFIG.rootUrl
});

environment.option_settings.push({
	"namespace": "aws:elasticbeanstalk:application:environment",
	"option_name": "PORT",
	"value": CONFIG.port
});

environment.option_settings.push({
	"namespace": "aws:ec2:vpc",
	"option_name": "VPCId",
	"value": CONFIG.VPCId
});

environment.option_settings.push({
	"namespace": "aws:ec2:vpc",
	"option_name": "ELBSubnets",
	"value": CONFIG.ELBSubnets
});

environment.option_settings.push({
	"namespace": "aws:ec2:vpc",
	"option_name": "Subnets",
	"value": CONFIG.Subnets
});

environment.option_settings.push({
	"namespace": "aws:elbv2:listener:443",
	"option_name": "SSLCertificateArns",
	"value": CONFIG.SSLCertificateArns
});

fs.mkdirSync(OUTPUT_DIRECTORY + '/bundle/.ebextensions');
fs.mkdirSync(OUTPUT_DIRECTORY + '/bundle/.elasticbeanstalk');
fs.writeFileSync(OUTPUT_DIRECTORY + '/bundle/.ebextensions/environment.config', JSON.stringify(environment), 'utf8');
fs.copyFileSync(INITIAL_DIRECTORY + '/resources/.elasticbeanstalk/config.yml', OUTPUT_DIRECTORY + '/bundle/.elasticbeanstalk/config.yml');
fs.copyFileSync(INITIAL_DIRECTORY + '/resources/package.json', OUTPUT_DIRECTORY + '/bundle/package.json');
fs.copyFileSync(INITIAL_DIRECTORY + '/resources/.npmrc', OUTPUT_DIRECTORY + '/bundle/.npmrc');
fs.copyFileSync(INITIAL_DIRECTORY + '/resources/.npmrc', OUTPUT_DIRECTORY + '/bundle/programs/server/.npmrc');

/* DEPLOYING */
console.log("4) Deploying app to beanstalk");
process.chdir(OUTPUT_DIRECTORY + '/bundle');
exec('eb deploy');


