var STATE_INITIAL = '';
var STATE_LOGON = 'Online';
var STATE_VOTING = 'Voting';
var STATE_VOTE_READY = 'Ready';
var STATE_ROUND_OVER = 'Round_over';
var STATE_TERMINATED = 'Terminated'; //0521
	
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
	//0521
	//Delete terminated users
	var terminate;
	terminate = false;
	for (var i in accountList) {
		if (accountList[i].state == STATE_TERMINATED) {
			terminate = true;
			break;
		}
	}

	//Only need initialize once
	if (accountList.length > 0 && terminate == false){
		return;
	}
	var dataJson = JSON.parse(data);
	var find;		
	/*for (var i in dataJson.accountList){
		find = false;
		for (var j in accountList) {
			if (accountList[j].name == dataJson.accountList[i].name){
				if(accountList[j].state == STATE_TERMINATED){
				accountList[j].state = STATE_INITIAL;
				}
				find = true;
				//break;
			}
		}

		if(find == false) {
			dataJson.accountList[i].state = STATE_INITIAL;
			accountList.push(dataJson.accountList[i]);
			//accountList[i].state = STATE_INITIAL;
		}
	}	*/
	accountList.length = 0;
	userList.length = 0;
	for (var i in dataJson.accountList){
		accountList.push(dataJson.accountList[i]);
	}

	for (var i in accountList){
		accountList[i].state = STATE_INITIAL;
	}

	unit = dataJson.unit;
}

var getUnit = function(){
	return unit;
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
		if (userName == userList[i].name && userList[i].state != STATE_TERMINATED ) {
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
	//user.onSeat = true;  // 0521

	//Search if user exists in userList
	var find = false;
	for (var i in userList){
		if (userList[i].name == userName){
			userList[i].state = STATE_LOGON;
			find = true;
		}
	}

	if (find == false){
		user.state = STATE_LOGON;
		userList.push(user);
	}

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
	
	//Calculate avg based on current voted user
	if ( result.count > 0 ){
		result.avg = result.total / result.count;
	}
}

exports.accountList = accountList;
exports.userList = userList;
exports.result = result;
exports.setIO = function(ioIn) {
	io = ioIn;
}
exports.initAccountList = initAccountList;
exports.getUserInfo = getUserInfo;
exports.getUnit = getUnit;
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
	
	for ( var i in userList ) {
		if (userList[i].name == user.name) {
			userList[i].point = user.point;
			userList[i].state = STATE_VOTE_READY;
			
			//User to be broadcast to client
			user = userList[i];
			break;
		}
	}
	updateResult();
	console.log(result);
	
	//Notify all clients for the result on completion of all online users
	if (result.count == userList.length) {	
		roundOver();		
    }else{
    	broadcast("point", {
    		user : user
    	});
    }
}

exports.logout = function(userName) {
	var user = getUserInfo(userName);
	if (!user){
		return;
	}
	
	//set state to initial
	user.state = STATE_INITIAL;	
	user.point = null;
	
	//delete the user from voting list: userList
	for ( var i in userList ) {
		if ( userList[i].name == userName ){
				userList.splice( i, 1 );
				break;
			}
	}
	
	console.log(user + " log out");
	broadcast("logout", {
		user : user,
		result : result,
		userList : userList
	});		
}

exports.terminateAccountList = function() {
	var admin;
	for (var i in userList) {
		userList[i].state = STATE_TERMINATED;
	}

	for (var i in accountList) {
		accountList[i].state = STATE_TERMINATED;
		if(accountList[i].role == 'admin') {
			admin = accountList[i].name;
		}
	}

	//0625
	console.log("Admin terminates current meeting");
	broadcast("terminate", {
		user : admin,
	})
}