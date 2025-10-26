import admin from 'firebase-admin';
import inquirer from 'inquirer';
import { initializeApp, cert } from 'firebase-admin/app';

// IMPORTANT: Replace with the actual path to your service account key file
const serviceAccount = require('../serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const questions = [
  {
    type: 'input',
    name: 'email',
    message: "Enter the new user's email address:",
    validate: function (value) {
      var pass = value.match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
      if (pass) {
        return true;
      }

      return 'Please enter a valid email address.';
    }
  },
  {
    type: 'password',
    name: 'password',
    message: "Enter the new user's password:",
    validate: function (value) {
      if (value.length < 6) {
        return 'Password must be at least 6 characters long.';
      }
      return true;
    }
  }
];

inquirer.prompt(questions).then(answers => {
  const { email, password } = answers;
  admin.auth().createUser({
    email: email,
    password: password
  })
    .then(userRecord => {
      console.log('Successfully created new user:', userRecord.uid);
    })
    .catch(error => {
      console.log('Error creating new user:', error);
    });
});
