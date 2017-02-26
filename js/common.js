/* Copyright (c) 2017 Felix Bolte */

// define json data as available in qual-o-mat-data
// see https://github.com/gockelhahn/qual-o-mat-data
var data_url = 'https://raw.githubusercontent.com/gockelhahn/qual-o-mat-data/master';
// instead, you can set a relative path, for self hosted data dir
//var data_url = 'data';
var json_list = 'list.json';
var json_overview = 'overview.json';
var json_answer = 'answer.json';
var json_party = 'party.json';
var json_statement = 'statement.json';
var json_opinion = 'opinion.json';

// save the states of the selection
var selected = '';
var overview_loaded;
var overview;
var answer_loaded;
var answer;
var statement_loaded;
var statement;
var opinion_loaded;
var opinion;
var parties = 0;

// reset overview vars
function reset_overview() {
    overview_loaded = false;
    overview = null;
}

// reset answer vars
function reset_answer() {
    answer_loaded = false;
    answer = null;
}

// reset statement vars
function reset_statement() {
    statement_loaded = false;
    statement = null;
}

// reset opinion vars
function reset_opinion() {
    opinion_loaded = false;
    opinion = null;
}

// clear error messages
function reset_error() {
    document.getElementById('error_election').innerHTML = '';
}

// clear header
function reset_header() {
    document.getElementById('header_election').innerHTML = '';
}

// clear result
function reset_result() {
    document.getElementById('result_election').innerHTML = '';
}

// reset all
function reset() {
    // clear html dom
    reset_error();
    reset_header();
    reset_result();
    // clear states
    reset_overview();
    reset_answer();
    reset_statement();
    reset_opinion();
}

// escape html special characters: &,<,>,",'
function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// fetch json files asynchronously and call callback handler with javascript object
function read_json_from_file(json_file, callback) {
    var request = new XMLHttpRequest();
    request.overrideMimeType("application/json");
    request.open('GET', json_file, true);
    request.onreadystatechange = function () {
        // if request finished
        if (request.readyState === 4) {
            var response_json = null;
            // if http is OK or NOT MODIFIED
            // or code is 0 in case it was opened as local file
            // (see https://www.w3.org/TR/XMLHttpRequest/#the-status-attribute)
            if (request.status === 0 || request.status === 200 || request.status === 304) {
                // uncomment the following line to see successful requests
                //console.log('SUCCES: ' + json_file);
                // try to parse response as json
                try {
                    response_json = JSON.parse(request.response);
                } catch (error) {
                    // set response_json again to null as the "try" will mangle it
                    response_json = null;
                    // log error into console
                    console.log('Response was: ' + request.response);
                    console.log('Failed to parse json (' + json_file + '): ' + error);
                };
            } else {
                console.log('Failed to load json (' + json_file + ') - HTTP CODE: ' + request.status);
            };
            // go back with parsed json or null
            callback(response_json);
        };
    };
    // set request timeout to 6 seconds
    request.timeout = 6000;
    request.ontimeout = function () {
        // if request did not finish after set timeout
        console.log('Failed to to load json (' + json_file + ') due to a timeout of ' + request.timeout + 'ms');
        // still go back with null
        callback(null);
    };
    request.send();
}

// calculate and save result for each party
function calculate_result() {
    // add property for each anwer for saving results
    for (var i = 0; i < statement.length; i++) {
        for (var j = 0; j < answer.length; j++) {
            var propname = 'answer_' + answer[j].id
            statement[i][propname] = 0;
        };
    };
    
    // sort statement array by id asc
    statement.sort(function(a, b) { 
        return a.id - b.id;
    });
    
    // sort opinion by party asc,statement asc
    opinion.sort(function(a, b) {
        if (a.party != b.party) {
            return a.party - b.party;
        };
        return a.statement - b.statement;
    });
    
    // sort answer array by id asc
    answer.sort(function(a, b) { 
        return a.id - b.id;
    });
    
    // iterate over all statements
    for (var x = 0; x < statement.length; x++) {
        // iterate over all parties
        for (var y = 0; y < parties; y++) {
            // calculate opinion id by party id and statement id
            var pos = y * statement.length + x;
            // add points for matching statements
            if (opinion[pos].statement === statement[x].id
                    && opinion[pos].party === y) {
                var propname = 'answer_' + opinion[pos].answer;
                statement[x][propname]++;
            };
        };
    };
}

// show error message
function show_error(msg) {
    if (msg === null) {
        msg = 'Failed to load or parse needed data. See console for more info. Please try again!';
    };
    var final_msg = '<pre>ERROR: ' + msg + '</pre>';
    document.getElementById('error_election').innerHTML += final_msg;
}

// fill up the dropdown menu with available elections
function show_list(elections) {
    var error = '';
    // list not loaded correctly, so show error
    if (elections === null) {
        show_error(null);
    } else if (elections.length == 0) {
        show_error('No available elections found.');
    } else {
        // get dropdown menu
        var select_election = document.getElementById('select_election');
        for (var i = 0; i < elections.length; i++) {
            // we do not need to use escapeHtml here, because option.text takes it literally
            var election = elections[i];
            var new_option = new Option(election);
            select_election.appendChild(new_option);
        };
        // enable dropdown menu and button to load election
        document.getElementById('select_election').disabled = false;
        document.getElementById('button_load_election').disabled = false;
    };
}

// show brief description about selected election
function show_header() {
    // overview not loaded correctly, so show error
    if (overview === null) {
        show_error('Failed to load or parse the election overview. See console for more info.');
    } else {
        var header = '<h4>' + escapeHtml(overview.title) + ' (<a target="_blank" href="' + escapeHtml(overview.info) + '">info</a>) am ' + escapeHtml(overview.date.slice(0,10)) + ' (<a target="_blank" href="' + escapeHtml(overview.data_source) + '">quelle</a>)</h4>';
        document.getElementById('header_election').innerHTML = header;
    };
    
    // enable election loading button only when statement/opinion/answer finished loading as well
    if (statement_loaded
            && opinion_loaded
            && answer_loaded) {
        document.getElementById('button_load_election').disabled = false;
    };
}

// put an array into Math.max() function
function getMaxOfArray(numArray) {
    return Math.max.apply(null, numArray);
}

// put an array into Math.min() function
function getMinOfArray(numArray) {
    return Math.min.apply(null, numArray);
}

// show parties and their results corresponding to the user answers
function show_result() {
    // not all files loaded correctly, so show error
    if (statement === null
            || opinion === null
            || answer === null) {
        show_error(null);
    } else {
        // do counting magic
        parties = opinion.length/statement.length;
        calculate_result();
        
        // create numbered list and add all parties
        result = ''
        for (var i = 0; i < statement.length; i++) {
            result += '<fieldset><legend><strong>' + (statement[i].id + 1) + '.</strong> <em>' + escapeHtml(statement[i].text) + '</em></legend>';
            // make an array with all answer values for later tagging
            var allresults = [];
            for (var j = 0; j < answer.length; j++) {
                var propname = 'answer_' + answer[j].id;
                allresults.push(statement[i][propname]);
            };
            for (var j = 0; j < answer.length; j++) {
                var propname = 'answer_' + answer[j].id;
                var value = statement[i][propname];
                if (value === getMaxOfArray(allresults)
                        && value !== getMinOfArray(allresults)) {
                    result += '<label class="left_pad max">';
                } else if (value === getMinOfArray(allresults)) {
                    result += '<label class="left_pad min">';
                } else {
                    result += '<label class="left_pad">';
                };
                result += answer[j].message + ' (' + value + ')';
                result += '</label>';
            };
            result += '</fieldset>';
        };
        document.getElementById('result_election').innerHTML = result;
    };
    
    // enable election loading button only when overview finished loading as well
    if (overview_loaded) {
        document.getElementById('button_load_election').disabled = false;
    };
    
    // go to the top where the result is displayed
    window.scrollTo(0, 0);
}

function callback_load_list(object) {
    show_list(object);
}

function callback_load_overview(object) {
    overview = object;
    show_header();
    overview_loaded = true;
}

function callback_load_answer(object) {
    answer = object;
    if (statement_loaded && opinion_loaded) {
        show_result();
    };
    answer_loaded = true;
}

function callback_load_statement(object) {
    statement = object;
    if (answer_loaded && opinion_loaded) {
        show_result();
    };
    statement_loaded = true;
}

function callback_load_opinion(object) {
    opinion = object;
    if (statement_loaded && answer_loaded) {
        show_result();
    };
    opinion_loaded = true;
}

function load_election() {
    document.getElementById('button_load_election').disabled = true;
    
    // check if selected option was already loaded before
    if (document.getElementById('select_election').value !== selected) {
        // save selected election
        selected = document.getElementById('select_election').value;
        // clear page and reset states
        reset();
    };
    
    // do not load json if already loaded
    if (overview !== null) {
        show_header();
    } else {
        reset_error();
        reset_header();
        reset_overview();
        read_json_from_file(data_url + '/' + selected + '/' + json_overview, callback_load_overview);
    };
    
    load_result();
}

function load_result() {
    // do not load json if already loaded
    if (statement !== null && opinion !== null && answer != null) {
        show_result();
    } else {
        reset_result();
        // if all needed entities are null, we have to set their $_loaded to false at once before calling each's read_json_from_file
        if (statement === null) {
            statement_loaded = false;
        };
        if (opinion === null) {
            opinion_loaded = false;
        };
        if (answer === null) {
            answer_loaded = false;
        };
        if (statement === null) {
            read_json_from_file(data_url + '/' + selected + '/' + json_statement, callback_load_statement);
        };
        if (opinion === null) {
            read_json_from_file(data_url + '/' + selected + '/' + json_opinion, callback_load_opinion);
        };
        if (answer === null) {
            read_json_from_file(data_url + '/' + selected + '/' + json_answer, callback_load_answer);
        };
    };
}

function init() {
    // clear page and reset states
    reset();
    // add click action to button
    document.getElementById('button_load_election').addEventListener('click', load_election);
    // load json list of available elections
    read_json_from_file(data_url + '/' + json_list, callback_load_list);
}

// call init when page has loaded
window.addEventListener('load', init);
