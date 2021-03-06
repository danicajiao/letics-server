const express = require("express");

// recordRoutes is an instance of the express router.
// We use it to define our routes.
// The router will be added as a middleware and will take control of requests starting with path /record.
const recordRoutes = express.Router();

// This will help us connect to the database
const dbo = require("../db/conn");

// This help convert the id from string to ObjectId for the _id.
const ObjectId = require("mongodb").ObjectId;

// ----------------- OUR CODE --------------------

// This section will help you initialize a new record.
recordRoutes.route("/users/init").post(function (req, response) {
    let db_connect = dbo.getDb();
    let myObj = {
        firebase_uid: req.body.firebase_uid,
        workouts: []
    };
    db_connect.collection("users").insertOne(myObj, function (err, res) {
        if (err) throw err;
        let customRes = {
            status: "SUCCESS",
            message: "User initialized successfully",
            data: myObj,
            mongodb: res
        }
        response.json(customRes);
    });
});

// This section will help you get a list of all the workouts by id
recordRoutes.route("/users/:uid/workouts").get(function (req, response) {
    let db_connect = dbo.getDb();
    let userQuery = { firebase_uid: req.params.uid };
    db_connect
        .collection("users")
        .findOne(userQuery, function (err, res) {
            if (err) throw err;
            if (res) {

                let workoutsQuery = {
                    _id: { $in: res.workouts }
                }
                db_connect
                    .collection("workouts")
                    .find(workoutsQuery)
                    .toArray(function (err, result) {
                        if (err) throw err;
                        response.json(result);
                    });
            }
        });
});

// This section will help you get a array of all the exercises by query string
recordRoutes.route("/exercises/:searchQuery").get(function (req, response) {
    let db_connect = dbo.getDb();
    let myObj = {
        searchQuery: req.params.searchQuery
    };
    console.log(myObj);

    db_connect
        .collection("exercises")
        .createIndex({ exercise_name: "text", exercise_type: "text" });

    db_connect
        .collection("exercises")
        .find({ $text: { $search: req.params.searchQuery } })
        .toArray(function (err, result) {
            if (err) throw err;
            response.json(result);
        });
});

// This section will help you get a array of all the exercises
recordRoutes.route("/exercises/").get(function (req, response) {
    let db_connect = dbo.getDb();
    db_connect
        .collection("exercises")
        .find({})
        .toArray(function (err, result) {
            if (err) throw err;
            response.json(result);
        });
});

// This section will help delete a workout by id for the user
recordRoutes.route("/users/:uid/workouts/:workout_id/delete").delete(function (req, response) {
    let db_connect = dbo.getDb();
    let userQuery = { firebase_uid: req.params.uid };
    db_connect
        .collection("users")
        .findOne(userQuery, function (err, res) {
            if (err) throw err;
            if (res) {
                db_connect
                    .collection("users")
                    .updateOne(
                        { firebase_uid: req.params.uid },
                        { $pull: { workouts: ObjectId(req.params.workout_id) } },
                        function (err, res) {
                            if (err) throw err;
                            // console.log("Workout added to user workout array");
                            let customRes = {
                                status: "SUCCESS",
                                message: "Workout for user deleted successfully",
                                data: req.body,
                                mongodb: res
                            }
                            // response.json(customRes);
                        }
                    );

                let workoutQuery = { _id: ObjectId(req.params.workout_id) }
                db_connect
                    .collection("workouts")
                    .deleteOne(workoutQuery, function (err, result) {
                        if (err) throw err;
                        if (result.deletedCount === 1) {
                            console.log("Successfully deleted one document.");
                        } else {
                            console.log("No documents matched the query. Deleted 0 documents.");
                        }
                        response.json(result);
                    });
                // .toArray(function (err, result) {
                //     if (err) throw err;
                //     response.json(result);
                // });
            }
        });
});

// This section will help deactivate a user by id
recordRoutes.route("/users/:uid/deactivate").delete(function (req, response) {
    let db_connect = dbo.getDb();
    let userQuery = { firebase_uid: req.params.uid };
    db_connect
        .collection("users")
        .findOne(userQuery, function (err, res) {
            if (err) throw err;
            if (res) {
                db_connect
                    .collection("workouts")
                    .deleteMany(
                        { _id: { $in: res.workouts } },
                        function (err, res) {
                            if (err) throw err;
                            // console.log("Workout added to user workout array");
                            console.log("Deleted " + res.deletedCount + " documents from 'workouts' collection");
                            // response.json(res);
                        }
                    );

                db_connect
                    .collection("users")
                    .deleteOne(userQuery, function (err, result) {
                        if (err) throw err;
                        if (result.deletedCount === 1) {
                            console.log("Successfully deleted user.");
                        } else {
                            console.log("No documents matched the query. Deleted 0 documents.");
                        }
                        response.json(result);
                    });
            }
        });
});

// This section will help update a workout by id for the user
recordRoutes.route("/users/:uid/workouts/:workout_id/update").put(function (req, response) {
    let db_connect = dbo.getDb();
    let userQuery = { firebase_uid: req.params.uid };
    db_connect
        .collection("users")
        .findOne(userQuery, function (err, res) {
            if (err) throw err;
            if (res) {
                let workoutQuery = { _id: ObjectId(req.params.workout_id) }
                let newExercises = {
                    $set: {
                        exercises: req.body,
                    },
                };
                db_connect
                    .collection("workouts")
                    .updateOne(workoutQuery, newExercises, function (err, result) {
                        if (err) throw err;
                        console.log("1 document updated");
                        response.json(result);
                    });
                // .toArray(function (err, result) {
                //     if (err) throw err;
                //     response.json(result);
                // });
            }
        });
});

// This section will help you log a new workout.
recordRoutes.route("/users/logWorkout").post(function (req, response) {
    let db_connect = dbo.getDb();
    db_connect.collection("workouts").insertOne(req.body, function (err, res) {
        if (err) throw err;
        if (res) {
            db_connect
                .collection("users")
                .updateOne(
                    { firebase_uid: req.body.firebase_uid },
                    { $push: { workouts: req.body._id } },
                    function (err, res) {
                        if (err) throw err;
                        // console.log("Workout added to user workout array");
                        let customRes = {
                            status: "SUCCESS",
                            message: "Workout for user logged successfully",
                            data: req.body,
                            mongodb: res
                        }
                        response.json(customRes);
                    }
                );

            // let customRes = {
            //     status: "SUCCESS",
            //     message: "Workout for user logged successfully",
            //     data: req.body,
            //     mongodb: res
            // }
            // response.json(customRes);
        }
    });
});

// ----------------- BOILERPLATE CODE --------------------
// This section will help you get a list of all the records.
recordRoutes.route("/record").get(function (req, res) {
    let db_connect = dbo.getDb("employees");
    db_connect
        .collection("records")
        .find({})
        .toArray(function (err, result) {
            if (err) throw err;
            res.json(result);
        });
});

// This section will help you get a single record by id
recordRoutes.route("/record/:id").get(function (req, res) {
    let db_connect = dbo.getDb();
    let myquery = { _id: ObjectId(req.params.id) };
    db_connect
        .collection("records")
        .findOne(myquery, function (err, result) {
            if (err) throw err;
            res.json(result);
        });
});

// This section will help you create a new record.
recordRoutes.route("/record/add").post(function (req, response) {
    let db_connect = dbo.getDb();
    let myobj = {
        person_name: req.body.person_name,
        person_position: req.body.person_position,
        person_level: req.body.person_level,
    };
    db_connect.collection("records").insertOne(myobj, function (err, res) {
        if (err) throw err;
        console.log("1 document inserted");
        response.json(res);
    });
});

// This section will help you update a record by id.
recordRoutes.route("/update/:id").post(function (req, response) {
    let db_connect = dbo.getDb();
    let myquery = { _id: ObjectId(req.params.id) };
    let newvalues = {
        $set: {
            person_name: req.body.person_name,
            person_position: req.body.person_position,
            person_level: req.body.person_level,
        },
    };
    db_connect
        .collection("records")
        .updateOne(myquery, newvalues, function (err, res) {
            if (err) throw err;
            console.log("1 document updated");
            response.json(res);
        });
});

// This section will help you delete a record
recordRoutes.route("/:id").delete((req, response) => {
    let db_connect = dbo.getDb();
    let myquery = { _id: ObjectId(req.params.id) };
    db_connect.collection("records").deleteOne(myquery, function (err, obj) {
        if (err) throw err;
        console.log("1 document deleted");
        response.status(obj);
    });
});

module.exports = recordRoutes;
