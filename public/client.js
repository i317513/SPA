$(document).ready(function() {
	$.ajax({
		type : "POST",
		url : "getUser",
		async : false,
		dataType : "json",
		success : function(data) {
			user = data.user;
			accountNumber = data.accountList.length;
			accountList = data.accountList;

			initSeatList();
			initECharts();			
		}
	});

	getCurrentServerData();
	updateUI(userList,result);

	$(".pointBtn").click(function() {
		var point = $(this).val();
		$("#point").val(point);
	});

	$("#newRound").click(function() {
		socket.emit("nextRound");
	})

	$("#submit").click(function() {
		var point = $("#point").val();
		if (point == "" || isNaN(point)) {
			alert("Please input a number.");
			return;
		}
		user.point = point;
		socket.emit("point", {
			user : user
		});
	});
	
	$("#roundOver").click(function() {
		socket.emit("roundOver");
	});
});
var user;
var accountNumber;
var accountList;
var userList;
// Result is retrieved when:
// 1)Each time "main" document is loaded;
// 2)At "Round_over" state,result is updated
var result = {};
// flag to specify
var isRoundOver = false;

var ROLE_ADMIN = 'admin';
var unit = 'hour';

var STATE_INITIAL = '';
var STATE_LOGON = 'Online';
var STATE_VOTING = 'Voting';
var STATE_VOTE_READY = 'Ready';
var STATE_ROUND_OVER = 'Round_over';

var BTN_START_ROUND = '#newRound';
var BTN_SUBMIT	= '#submit';
var BTN_ROUND_OVER = '#roundOver';

var myChart;
var option = {};
function initECharts() {
	myChart = echarts.init(document.getElementById('main'));
	// myChart = echarts.init($("#main"));
	option = {
		title : {
			text : 'Pie statistics',
			left : 'center',
			top : 0,
			textStyle : {
				color : '#888'
			}
		},
		series : [ {
			name : 'Data source',
			type : 'pie',
			radius : '80%',
			data : []
		} ]
	}
	updateEChartResult();
}

function updateEChartResult(userList, result) {
	var temp = {};
	var data2show = [];
	//do not show the result if vote is not ready
	if (typeof(userList) == "undefined" ||	typeof(result) == "undefined" 
		||	result === null || !result.show ) {
		data2show.push({
			name : "not ready",
			value : 0
		});
		option.series[0].data = data2show;
		myChart.setOption(option);
		return;
	}

	for ( var j in userList) {
		if (userList[j].point in temp) {
			temp[userList[j].point]++;
		} else {
			temp[userList[j].point] = 1;
		}
	}
	for ( var h in temp) {
		data2show.push({
			name : h,
			value : temp[h]
		});
	}

	option.series[0].data = data2show;
	myChart.setOption(option);
}
function getCurrentServerData() {
	$.ajax({
		type : "POST",
		url : "getCurrentList",
		async : false,
		dataType : "json",
		success : function(data) {
			userList = data.userList;
			result = data.result;		
			unit = data.unit;

			/*if (accountNumber == userList.length) {
				$("#newRound").removeAttr("disabled");
			}*/
		}
	});
}

function initSeatList() {
	// <li class="list-group-item" id="user_ling"><span id="userName_ling" >ling:</span><span
	// id="userPoint_ling" class="personalData">3</span></li>
	for (var i = 0; i < accountNumber; i++) {
		$(".list-group ul").append(
				'<li class="list-group-item"><span id="userName_' +  accountList[i].name + '" >' + accountList[i].name
						+ ':</span> <span id="userPoint_' + accountList[i].name 
						+ '" >' + STATE_INITIAL + '</span></li>');
	}
}

function updateSeats(userList) {
	if (typeof(userList) == "undefined") {
		return;
	}

	var text = '';
	var css = '';
	for (var i = 0; i < userList.length; i++) {
		// update state for each logon user
		if (userList[i].state == STATE_ROUND_OVER) {
			css = "point";
			if (userList[i].point == result.highest) {
				css = "pointH";
			}
			if (userList[i].point == result.lowest) {
				css = "pointL";
			}
			text = userList[i].point;
			//$("#userName_" + userList[i].name).attr( "class", css );
		} else {
			switch (userList[i].state){
			case STATE_VOTING:
				css = "voting";
				break;
			case STATE_VOTE_READY:
				css = "ready";
				break;
			default:
				break;
			}
			text = userList[i].state;
		}
		$("#userName_" + userList[i].name).attr( "class", css );
		$("#userPoint_" + userList[i].name).attr( "class", css );
		$("#userPoint_" + userList[i].name).text(text);
	}
}

// based on userList, and result
function updateUI(userList, result) {
	// 1. update seats
	updateSeats(userList);

	// 2. update pie
	updateEChartResult(userList, result);

	// 3.update statistics list
	updateStatsResult(result);

	// 4. update ui elements	
	$("#unit").html("Estimate:("+ unit + ")");
	
	//update button display
	if (user.role == ROLE_ADMIN) {
		//display all buttons
		$(BTN_START_ROUND).show();
		$(BTN_ROUND_OVER).show();
		
		$(BTN_SUBMIT).show();	
	}
	else{
		//normal user, hide the "new round" and "show result" 
		$(BTN_START_ROUND).hide();
		$(BTN_ROUND_OVER).hide();
		
		$(BTN_SUBMIT).show();		
	}
}

function updateStatsResult(result) {
	// result can have partial value if not all have voted,need hide the result.
	if (typeof(result) == "undefined" || result === null ) {
		return;
	}
	var avg = 0;
	var high = 0;
	var low = 0;
	//var variance = 0;
	//able to show result depending on flag data from server
	if (result.show) {
		avg = result.avg.toFixed(1);
		high = result.highest;
		low = result.lowest;
	}
	$("#pointAvg").text(avg);
	$("#pointmax").text(high);
	$("#pointmin").text(low);
	
	//update result title with unit
	$("#result-title").text("Result(" + unit + ")");
}
// create connection
var socket = io();
socket.on("connect", function() {
	console.log("Socket connected.");
});

socket.on("newJoin", function(e) {
	var data = JSON.parse(e);
	userList = data.userList;
	if (user.name == data.user.name) {
		user = data.user
	}
	updateSeats(userList);
});

socket.on("point", function(e) {
	var user = JSON.parse(e).user;
	// $("#userPoint_" + user.name).empty();
	// $("<div class='ready'>Ready</div>").appendTo($("#userPoint_" +
	// user.name)).fadeIn(1500);
	$("#userName_" + user.name).attr( "class", "ready" );
	$("#userPoint_" + user.name).attr( "class", "ready" );	
	$("#userPoint_" + user.name).text(STATE_VOTE_READY);	

});

socket.on("roundOver", function(e) {
	result = JSON.parse(e).result;
	userList = JSON.parse(e).userList;
	
	updateUI(userList,result);

	//Now showing the result, submit and show result is disabled
	$(BTN_SUBMIT).attr("disabled", "disabled");
	$(BTN_ROUND_OVER).attr("disabled", "disabled");
	
	$(BTN_START_ROUND).removeAttr("disabled");	
});
socket.on("nextRound", function(e) {
	var data = JSON.parse(e);
	userList = data.userList;
	result = data.result;
	
	updateUI(userList,result);	

	//the new round button itself is disabled 
	$(BTN_SUBMIT).removeAttr("disabled");	
	$(BTN_ROUND_OVER).removeAttr("disabled");
	
	$(BTN_START_ROUND).attr("disabled", "disabled");
});
socket.on("full", function() {
	$(BTN_START_ROUND).removeAttr("disabled");
});
socket.on('disconnect', function(e) {
	console.log("Connection closed.");
});

function disconnect() {
	ws.close();
}
