var STATE_INITIAL = '';
var STATE_LOGON = 'Online';
var STATE_VOTING = 'Voting';
var STATE_VOTE_READY = 'Ready';
var STATE_ROUND_OVER = 'Round_over';
	
var userList = [];
var result = {
	avg : 0,
	highest : null,
	lowest : null,
	total : 0,
	count : 0,
	show : false
};
var accountList = [];
var unit = 'Story point';
var io;

//Initialize accountList
var initAccountList = function(data) {
	accountList = JSON.parse(data);
	for ( var i in accountList ){
		accountList[i].state = STATE_INITIAL;
	}
}

// get full userInfo by userName
var getUserInfo = function(userName) {
	for ( var i in accountList) {
		if (userName == accountList[i].name) {
			return accountList[i];
		}
	}
}
// check whether user is in user list
var isInList = function(userName) {
	for ( var i in userList) {
		if (userName == userList[i].name) {
			return true;
		}
	}
	return false;
}
// when login, use this do authorization
var loginCheck = function(user) {
	return true;
}
//on action: join
var join = function(userName) {
	var user = getUserInfo(userName);
	user.onSeat = true;
	user.state = STATE_LOGON;
	userList.push(user);

	broadcast("newJoin", {
		user : user,
		userList : userList
	});
	if (userList.length == accountList.length) {
		broadcast("full");
	}
}

var broadcast = function(action, param) {
	io.emit(action, JSON.stringify(param));
}

var updateResult = function() {
	result.count = result.total = result.avg = 0;
	result.highest = result.lowest = null;
	for (var i = 0; i < userList.length; i++) {
		var user = userList[i];
		if (user.point) {
			user.point = user.point * 1;
			result.count++;
			result.total += user.point;
			result.highest = (result.highest < user.point) ? user.point
					: result.highest;
			result.lowest = result.lowest === null ? user.point
					: ((result.lowest > user.point) ? user.point
							: result.lowest);
		}
	}
	result.avg = result.total / result.count;
}

exports.unit = unit;
exports.accountList = accountList;
exports.userList = userList;
exports.result = result;
exports.setIO = function(ioIn) {
	io = ioIn;
}
exports.initAccountList = initAccountList;
exports.getUserInfo = getUserInfo;
exports.isInList = isInList;
exports.loginCheck = loginCheck;
exports.join = join;
exports.broadcast = broadcast;
exports.nextRound = function() {
	for ( var i in userList) {
		userList[i].point = null;
		userList[i].state = STATE_VOTING;
	}
	result.show = false;
	result.avg = result.total = result.count = 0;
	result.highest = result.lowest = null;	
	broadcast("nextRound", {
		userList : userList,
		result : result
	});
};

var roundOver = function() {
	for( var i in userList){
		userList[i].state = STATE_ROUND_OVER;
	}
	result.show = true;
	broadcast("roundOver", {
		result : result,
		userList : userList
	});
};

exports.roundOver = roundOver;
exports.point = function(e) {
	var user = e.user;
	user.state = STATE_VOTE_READY; //make sure user state is correct.this will be send back to client
	for ( var i in userList) {
		if (userList[i].name == user.name) {
			userList[i].point = user.point;
			userList[i].state = STATE_VOTE_READY;
			break;
		}
	}
	updateResult();
	console.log(result);
	broadcast("point", {
		user : user,
	});
	if (result.count == accountList.length) {
		roundOver();		
	}
}