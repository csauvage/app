import React, { Component } from 'react';
import * as firebase from "firebase";
import MapView from 'react-native-maps';
const styles = require('./styles.js')

import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
  Button,
  TextInput,
  NavigatorIOS
} from 'react-native';

firebase.initializeApp({
});

export default class NavigatorIOSApp extends Component {
  constructor(props) {
    super(props)
  }

  render() {
    return (
      <NavigatorIOS
        initialRoute={{
          component: login,
          title: 'Login'
        }}
        style={{flex: 1}}
      />
    );
  }
}

export class mapview extends Component {
  constructor(props) {
    super(props)

    this.state = {
      markers: [],
      lastPosition: 'unknown'
    }

    Database.listenToUsers(this.onOtherUserUpdatedLocation)
  }

  onOtherUserUpdatedLocation = (userId, lat, lng, timestamp) => {
    let foundExisting = false
    let coordinate = {latitude: parseFloat(lat), longitude: parseFloat(lng)}

    for (let i = 0; i < this.state.markers.length; i++) {
      if (this.state.markers[i]["key"] == userId) {
        this.state.markers[i]["coordinate"] = coordinate
        foundExisting = true
      }
    }

    if (!foundExisting) {
      this.state.markers.push({
        coordinate: coordinate,
        key: userId,
        title: userId,
        description: "fastlane guy"
      })
    }

    // So that react re-renders
    this.setState({ markers: this.state.markers })
    console.log(this.state.markers)
  }

  // Location tracking
  watchID: ?number = null;

  componentDidMount() {
    console.log("starting location listening")

    this.watchID = navigator.geolocation.watchPosition((position) => {
      var lastPosition = JSON.stringify(position);
      this.setState({lastPosition});

      let userId = this.props.route.userId

      Database.setUserLocation(userId, 
          position.coords.latitude + "", 
          position.coords.longitude + "", 
          position.timestamp + "")
    });
    // (error) => alert(JSON.stringify(error)),
    // {enableHighAccuracy: true});
  }

  componentWillUnmount() {
    navigator.geolocation.clearWatch(this.watchID);
  }

  render() {
    return (
      <View style={styles.container}>
        <MapView
          initialRegion={{
            latitude: 37.78825,
            longitude: -122.4324,
            latitudeDelta: 1.322,
            longitudeDelta: 0.721,
          }}
          style={styles.map}
        >
          {this.state.markers.map(marker => (
            <MapView.Marker
              coordinate={marker.coordinate}
              title={marker.title}
              description={marker.description}
              key={marker.key}
            />
          ))}
        </MapView>
      </View>
    );
  }
}

export class login extends Component {
  constructor(props) {
    super(props)

    this.state = {
      email: 'email@krausefx.com',
      password: 'abcdefg123'
    }
  }

  async signup(email, pass) {
    try {
      console.log("start")
      await firebase.auth().createUserWithEmailAndPassword(email, pass);

      console.log("Account created");
    } catch (error) {
      console.log(error.toString())
    }
  }

  async login(email, pass) {
    try {
      let userSession = await firebase.auth()
          .signInWithEmailAndPassword(email, pass);

      let userId = userSession.uid
      console.log("Logged In for user with ID: " + userId);

      this.props.navigator.push({
        component: mapview,
        title: 'Map',
        userId: userId
      });
    } catch (error) {
      console.log(error.toString())
    }
  }

  async logout() {
    try {
      await firebase.auth().signOut();
    } catch (error) {
      console.log(error);
    }
  }

  onPressRegister = () => {
    this.signup(this.state.email, this.state.password)
  }

  onPressLogin = () => {
    this.login(this.state.email, this.state.password)
  }

  render() {
    return (
      <View style={styles.container}>
        <TextInput
          style={styles.email}
          placeholder="Email"
          onChangeText={email => this.setState({email})}
          value={this.state.email}
        />
        <TextInput
          style={styles.password}
          placeholder="Password"
          secureTextEntry={true}
          onChangeText={password => this.setState({password})}
          value={this.state.password}
        />
        <Button
          onPress={this.onPressRegister}
          title="Register"
          color="#841584"
          accessibilityLabel="Signup"
        />
        <Button
          onPress={this.onPressLogin}
          title="Login"
          color="#841584"
          accessibilityLabel="Login"
        />
      </View>
    );
  }
}

AppRegistry.registerComponent('wwdcfamily', () => NavigatorIOSApp);

class Database {
  /**
   * Sets a user location
   * @param userId
   * @param lat
   * @param lng
   * @param timestamp
   * @returns {firebase.Promise<any>|!firebase.Promise.<void>}
   */
  static setUserLocation(userId, lat, lng, timestamp) {
    let userLocationPath = "/user/" + userId + "/details";

    return firebase.database().ref(userLocationPath).set({
      lat: lat,
      lng: lng,
      timestamp: timestamp
    })
  }

  /**
   * Listen for changes to any user's location
   * @param callback Users details
   */
  static listenToUsers(callback) {
    let userDetailsPath = "/user/"
    let usersRef = firebase.database().ref(userDetailsPath)

    // Get a list of all existing users
    usersRef.once("value").then(function(snapshot) {
      let snap = snapshot.val()
      for (var userId in snap) {
        var data = snap[userId]
        let userDetails = data.details
        callback(userId, userDetails.lat, userDetails.lng, userDetails.timestamp)
      }

      // and from now on: listen to new users
      usersRef.on('child_changed', function(data) {
        let userId = data.key
        let userDetails = data.val().details
        callback(userId, userDetails.lat, userDetails.lng, userDetails.timestamp)
      });
    });
  }
}

module.exports = Database;