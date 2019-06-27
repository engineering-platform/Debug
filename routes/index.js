var express = require('express');
var router = express.Router();
var fs = require('fs');
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";
var dbo;

const { c, cpp, node, python, java } = require('compile-run');

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index');
});

router.post('/debug', function (req, res, next) {
  //console.log(req.body);
  //if (req.body.type == "cr") {
    //console.log("called2");
    var lang = req.body.lang;
    var program = req.body.program;
    var qid = "5d1492f426f319ede1f66efb";  //fill in the question id
    //var code = './Solution'+lang;
    fs.writeFile('Solution.' + lang, program, function (err) {
        if (err) {
          console.log(err);
        }
        else
          console.log('File is created successfully.');
      });

    MongoClient.connect(url, function (err, db) {
      if (err) throw err;
      dbo = db.db("debug");
      dbo.collection("questions").find().toArray(function (err, result) {
        //console.log(result);
        if (err) return err;
        console.log("input path = "+result[0].testcase_path.input);
        console.log(typeof(result[0].testcase_path.input));
        sampleCases(result[0].testcase_path, res, lang);
      });
      db.close();
    });
  //}
});

function sampleCases(cases, res, lang) {
  var test_cases = String(getTestCases(cases.input)).split("\n");
  var output = String(getOutput(cases.output)).split("\n");
  // console.log("out = "+typeof(output));
  console.log("outtputsdfasdf ",output);
  var answer_mapping = {};
  var user_answers = {};
  for (let i = 0; i < test_cases.length; i++) {
    answer_mapping[test_cases[i]] = output[i].trim();
    user_answers[test_cases[i]] = 'fail';
  }

  var user_mapping = {};
  console.log("compiler");
  for (let i = 0; i < test_cases.length; i++) {
    compiler(test_cases[i], user_mapping, test_cases.length, answer_mapping, user_answers, res, lang);
  }
}

function getTestCases(path) {
  console.log("get test cases "+typeof(path));
  let test_cases = fs.readFileSync(path);
  console.log('test_cases = '+test_cases);
  //console.log(test_cases);
  return test_cases;
}

function getOutput(path) {
  let output = fs.readFileSync(path);
  console.log('output1 = '+output);
  //console.log(output);
  return output;
}

function compiler( test_case, user_mapping, tclength, answer_mapping, user_answers, res, lang) {
  console.log("compiler entered");
  console.log(test_case);
  console.log(lang);
  let resultPromise
  switch (lang) {
    case 'java':
        console.log("java");
        resultPromise = java.runFile('Solution.java', { stdin: test_case });
        resultPromise.then(result => {
          console.log("test case = ", test_case," result = ",result);
          user_mapping[test_case] = result;
          //console.log("user mapping", user_mapping);
          if (Object.keys(user_mapping).length == tclength) {
            console.log("before print");
            printfunc(user_mapping, answer_mapping, user_answers, res);
          }
          return true;
        })
          .catch(err => {
            console.log(err);
            return err;
          });
        break;
    // case 'cpp':
    //   break;
    // case 'python':
    //   resultPromise = python.runSource(code, { stdin: test_case });
    //   resultPromise.then(result => {
    //     user_mapping[test_case] = result;
    //     //console.log("user mapping", user_mapping);
    //     if (Object.keys(user_mapping).length == tclength) {
    //       printfunc(user_mapping, answer_mapping, user_answers, res);
    //     }
    //     return true;
    //   })
    //     .catch(err => {
    //       console.log(err);
    //       return err;
    //     });
    //   break;
    default:
      console.log('invalid');
      break;
  }
}

function printfunc(user_mapping, answer_mapping, user_answers, res) {
  console.log("print function");
  var error = {};
  let k = 0;
  for (key in user_mapping) {
    console.log(key);
    console.log("user_mapping[key] "+user_mapping[key]);
    if (user_mapping[key].stderr.trim() == "") {
      error[key] = "-";
    } else {
      error[key] = user_mapping[key].stderr.trim();
    }
    if (user_mapping[key].stdout.trim() == answer_mapping[key]) {
      user_answers[key] = 'pass';
      k++;
    }
  }
  console.log("loop finished");
  var result = {};
  result['result'] = [];
  for (key in user_answers) {
    var temp = {};
    temp['test_case'] = key.trim();
    temp['user_output'] = user_mapping[key].stdout.trim();
    temp['req_output'] = answer_mapping[key];
    temp['result'] = user_answers[key];
    temp['error'] = error[key];
    result['result'].push(temp);
  }
  result['passed'] = k;
  result['total'] = Object.keys(user_mapping).length;
  
  res.send(result);
  res.end();
}

module.exports = router;




