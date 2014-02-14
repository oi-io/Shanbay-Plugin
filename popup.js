
var M = {
	reset: function() {
		this.word = null;
		this.candidate = null;
		this.vocabulary = null;
		this.pronunciation = null;
		this.audio = null;
		this.frequence = null;
		this.definition = null;
		this.learning_id = null;
		this.retention = null;
		this.target_retention = null;
		this.percentage = null;
		this.errormsg = null;
		this.notlogin = null;

		this.geting = false;
		this.translating = false;
		this.adding = false;
		this.forgeting = false;

		this.review_options = false;
		this.review_typed = null;
		this.review_waiting = false;
		this.refer_list = null;
		this.derive_list = null;
		this.family_list = null;
		this.synonym_list = null;
		this.similar_list = null;
	}, 

	set: function(s) {
		for (var i in s) {
			this[i] = s[i];
		}
		render();
	}
};

function gotoURL(url) {
	chrome.tabs.create({url: url});
}


function queryWord(w) {
	M.reset();
	M.word = w;
	if (isValid(M.word)) {
		M.geting = true;
		getShanbayWord(M.word, function(result, value) {
			if (result === "OK") {
				M.vocabulary = value.content;
				M.pronunciation = value.pronunciation;
				M.audio = value.audio;
				M.definition = value.definition;
				M.learning_id = value.learning_id;
				M.retention = value.retention || 0;
				M.target_retention = value.target_retention || 5;
				var percentage = M.retention * 100.0 / M.target_retention;
				if (percentage < 3.0) {
					percentage = 3.0;
				} else if (percentage > 100.0) {
					percentage = 100.0;
				}
				M.percentage = percentage;
			} else {
				M.errormsg = result;
			}
			getFrequency(M.vocabulary || M.word, function(result, frequence, family) {
				M.frequence = frequence;
				M.family_list = family;
				render();
			});
			M.geting = false;
			render();
		});
	} else {
		M.word = null;
	}
	render();
}

function onForget() {
	if (M.learning_id) {
		M.forgeting = true;
		render();
		forgetShanbayWord(M.learning_id, function(result){
			M.forgeting = false;
			if (result === "OK") {
				queryWord(M.vocabulary);
			} else {
				M.errormsg = result;
				render();
			}
		});
	}
}

function onAdding() {
	if (M.vocabulary) { 
		M.adding = true;
		render();
		addShanbayWord(M.vocabulary, function(result, reason){
			M.adding = false;
			if (result === "OK") {
				queryWord(M.vocabulary);
			} else {
				M.errormsg = result;
				M.notlogin = reason == "notlogin";
				render();
			}
		});
	}
}


var lastQueried = null;
function onQuery() {
	var queried = $('#queryword').val();
	if (queried === undefined || queried === null) {
		return;
	}
	queried = queried.trim();
	if (queried == lastQueried) {
		return;
	}
	lastQueried = queried;

	M.reset();
	if (queried.length == 0) {
		render();
		return;
	}

	if (hasChinese(queried)) {
		M.translating = true;
		render();

		getTranslate(queried, function(result, translate) {
			M.translating = false;
			if (result !== "OK") {
				M.errormsg = result;
				render();
				return;
			}
			if (translate.length == 1) {
				queryWord(translate[0][0]);
				return;
			} 
			M.candidate = translate;
			render();
		});
	} else if (areEnglish(queried)){
		queryWord(queried);
	} else {
		var candidate = getCandidate(queried, 120);
		if (candidate.length == 0) {
			M.errormsg = "匹配失败，没有相应的单词。";
			render();
		} else if (candidate.length == 1) {
			queryWord(candidate[0][0]);
		} else {
			M.candidate = candidate;
			render();
		}
	}
}

function onChoice() {
	lastQueried = null;
	queryWord($(this).prop("candidate"));
}

function render() {
	if (M.translating || M.geting) {
		$('#queryword').css("background", "rgb(252, 252, 252) url('image/inquire.gif') no-repeat right center");
	} else {
		$('#queryword').css("background", "rgb(252, 252, 252)");
	}

	if (M.candidate != null && M.candidate.length > 1) {
		$('#pp_candidate').empty();
		for (i in M.candidate) {
			var c = $("<a href='#' class='list-group-item'>" + M.candidate[i].join(" ") +"</a>");
			c.prop("candidate", M.candidate[i][0]);
			c.click(onChoice);
			$('#pp_candidate').append(c);
		}
		$('#pp_candidate').show();
	} else {
		$('#pp_candidate').empty();
		$('#pp_candidate').hide();
	}

	if (isValid(M.vocabulary)) {
		$('#pp_heading, #pp_body').show();
		$('#word').html(M.vocabulary);
		$('#pronunciation').html(M.pronunciation ? "[" + M.pronunciation + "]" : "");
		if (M.frequence) {
			$('#frequence').html(M.frequence.pages + "~" + M.frequence.fpages);
		}

		$('#definition').html(M.definition.split('\n').join('<br>'));
		if (M.learning_id != undefined && M.learning_id != null && M.learning_id != 0) { 
			if (M.retention != null && M.target_retention != null) { 
				$('#current_retention').html(M.retention);
				$('#target_retention').html(M.target_retention);
				$('#current_retention').css("width", "" + M.percentage + "%");
			}
			$('#retention').show();
		} else {
			$('#retention').hide();
		} 

		if (M.learning_id != undefined && M.learning_id != null && M.learning_id != 0) { 
			$('#old_forget').show();
			$('#new_adding').hide();
		} else {
			$('#new_adding').show();
			$('#old_forget').hide();
		}

		if (M.adding || M.forgeting) {
			$('#adding_forget_waiting').html("<img src='image/inquire.gif'/>");
		} else {
			$('#adding_forget_waiting').html("");
		}

	} else if (isValid(M.word)) {
		$('#pp_heading').show();
		$('#pp_body').hide();
		
		$('#word').html(M.word);
		$('#pronunciation').html("");

	} else {
		$('#pp_heading, #pp_body').hide();
	}

	if (M.review_options) {
		$('#reviewoptions').show();

		if (M.review_typed === "refer") {
			$('#old_refer_review').css("border-bottom", "1px solid rgb(160, 160, 160)");
			if (M.refer_list && M.refer_list.length > 0) {
				$('#reviewcontent').empty();
				for (var i in M.refer_list) {
					var c = $("<span style='margin-right: 9px;'>" + M.refer_list[i][0] + "：" + M.refer_list[i][1].join(" ") +"</span>");
					$('#reviewcontent').append(c);
				}
			} else {
				$('#reviewcontent').html(" 无 ");
			}
			$('#reviewcontent').show();
		} else {
			$('#old_refer_review').css("border-bottom", "none");
		}

		if (M.review_typed === "synonym") {
			$('#old_synonym_review').css("border-bottom", "1px solid rgb(160, 160, 160)");
			if (M.synonym_list && M.synonym_list.length > 0) {
				$('#reviewcontent').empty();
				for (var i in M.synonym_list) {
					var p =$("<p>" + M.synonym_list[i][0] + "：</p>");
					for (var j in M.synonym_list[i][1]) {
						var c = $("<a href='#' style='margin-right: 9px'>" + M.synonym_list[i][1][j] +"</a>");
						c.prop("candidate", M.synonym_list[i][1][j]).click(onChoice).appendTo(p);
					}
					$('#reviewcontent').append(p);
				}
			} else {
				$('#reviewcontent').html(" 无 ");
			}
			$('#reviewcontent').show();
		}  else {
			$('#old_synonym_review').css("border-bottom", "none");
		}

		if (M.review_typed === "derive") {
			$('#old_derive_review').css("border-bottom", "1px solid rgb(160, 160, 160)");
			if (M.derive_list && M.derive_list.length > 0) {
				$('#reviewcontent').empty();
				for (var i in M.derive_list) {
					// $('#reviewcontent').append($(M.derive_list[i][0] + "："));
					for (var j in M.derive_list[i][1]) {
						var c = $("<a href='#' style='margin-right: 9px'>" + M.derive_list[i][1][j] +"</a>");
						c.prop("candidate", M.derive_list[i][1][j]).click(onChoice);
						$('#reviewcontent').append(c);
					}
				}
			} else {
				$('#reviewcontent').html(" 无 ");
			}
			$('#reviewcontent').show();
		}  else {
			$('#old_derive_review').css("border-bottom", "none");
		}		

		if (M.review_typed === "family") {
			$('#old_family_review').css("border-bottom", "1px solid rgb(160, 160, 160)");
			if (M.family_list && M.family_list.length > 0) {
				$('#reviewcontent').empty();
				for (var i in M.family_list) {
					var c = $("<a href='#' style='margin-right: 9px'>" + M.family_list[i].word + "</a>");
					var d = $("<span>" + M.family_list[i].pages  +"~"+ M.family_list[i].fpages+ "</span><br/>");
					c.prop("candidate", M.family_list[i].word).click(onChoice);
					$('#reviewcontent').append(c);
					$('#reviewcontent').append(d);
				}
			} else {
				$('#reviewcontent').html(" 无 ");
			}
			$('#reviewcontent').show();
		}  else {
			$('#old_family_review').css("border-bottom", "none");
		}		
		
		if (M.review_typed === "similar") {
			$('#old_similar_review').css("border-bottom", "1px solid rgb(160, 160, 160)");
			if (M.similar_list && M.similar_list.length > 0) {
				$('#reviewcontent').empty();
				for (var i in M.similar_list) {
					var c = $("<a href='#' style='margin-right: 9px'>" + M.similar_list[i] +"</a>");
					c.prop("candidate", M.similar_list[i]).click(onChoice);
					$('#reviewcontent').append(c);
				}
			} else {
				$('#reviewcontent').html(" 无 ");
			}
			$('#reviewcontent').show();
		} else {
			$('#old_similar_review').css("border-bottom", "none");
		}

		if (M.review_waiting) {
			$('#reviewcontent').html("<img src='image/inquire.gif'/>");
		} 
	} else {
		$('#reviewoptions').hide();
		$('#reviewcontent').html("");
	} 

	if (isValid(M.errormsg)) {
		$('#errormsg').html(M.errormsg).show();
		if (M.notlogin) {
			var c = $("<a href='#'>登录扇贝网</a>");
			c.click(function(){gotoURL("http://www.shanbay.com/accounts/login/");});
			$("#errormsg").append(c);
		}
	} else {
		$('#errormsg').html("").hide();
	}
}

function pronunceWord() {
	if (M.audio) {
		var sound = new Howl({urls: [M.audio] }).play();
	}
}

$(document).ready(function() {
	// document.execCommand('paste');
	M.reset();

	if (preference.get().RealtimeQuery) {
		$('#queryword').keyup(onQuery);
	} 

	$('#wordquery').click(onQuery);

	$('#old_forget').click(onForget);
	$('#new_adding').click(onAdding);

	Mousetrap.bindGlobal('enter', function() {
		onQuery();
		return false;
	});

	Mousetrap.bindGlobal(['ctrl+s', 'command+s'], function() {
		onAdding();
		return false;
	});
	Mousetrap.bind(['s s', 's space'], function() {
		onAdding();
		return false;
	});

	Mousetrap.bindGlobal(['ctrl+f', 'command+f'], function() {
		onForget();
		return false;
	});
	Mousetrap.bind('f f', function() {
		onForget();
		return false;
	});

	Mousetrap.bindGlobal(['ctrl+p', 'command+p'], function() {
		pronunceWord();
		return false;
	});
	Mousetrap.bind(['p', 'space'], function() {
		pronunceWord();
		return false;
	});

	$('#old_review').click(function() {
		if (M.learning_id) {
			gotoURL("http://www.shanbay.com/review/learning/" + M.learning_id);
		} else {
			M.review_options = !M.review_options;
			render();
		}
	});
	$('#more_review').click(function() {
		M.review_options = !M.review_options;
		render();
	});

	$('#old_iciba_review').click(function() {
		M.vocabulary && gotoURL("http://www.iciba.com/" + M.vocabulary);
	});
	$('#old_youdao_review').click(function() {
		M.vocabulary && gotoURL("http://dict.youdao.com/search?q=" + M.vocabulary);
	});
	$('#old_vocabulary_review').click(function() {
		M.vocabulary && gotoURL("http://www.vocabulary.com/dictionary/" + M.vocabulary);
	});
	$('#old_etymology_review').click(function() {
		M.vocabulary && gotoURL("http://www.etymonline.com/index.php?term=" + M.vocabulary);
	});
	$('#old_shanbay_review').click(function() {
		M.learning_id && gotoURL("http://www.shanbay.com/review/learning/" + M.learning_id);
	});

	$('#old_refer_review').click(function(){
		M.review_typed = "refer";
		if (M.refer_list == null) {
			M.review_waiting = true;
			getFromIciba(M.vocabulary || M.word, function(r, d) {
				M.refer_list = r;
				M.derive_list = d;
				M.review_waiting = false;
				render();
			});
		} 
		render();
	});	
	$('#old_synonym_review').click(function(){
		M.review_typed = "synonym";
		if (M.synonym_list == null) {
			M.review_waiting = true;
			getFromYoudao(M.vocabulary || M.word, function(s) {
				M.synonym_list = s;
				M.review_waiting = false;
				render();
			});
		} 
		render();
	});	
	$('#old_derive_review').click(function(){
		M.review_typed = "derive";
		if (M.derive_list == null) {
			M.review_waiting = true;
			getFromIciba(M.vocabulary || M.word, function(r, d) {
				M.refer_list = r;
				M.derive_list = d;
				M.review_waiting = false;
				render();
			});
		} 
		render();
	});
	$('#old_family_review').click(function(){
		M.review_typed = "family";
		if (M.family_list == null) {
			M.review_waiting = true;
			getFrequency(M.vocabulary || M.word, function(result, frequence, family) {
				M.frequence = frequence;
				M.family_list = family;
				M.review_waiting = false;
				render();
			});
		} 
		render();
	});
	$('#old_similar_review').click(function(){
		M.review_typed = "similar";
		if (M.similar_list == null) {
			M.similar_list = getSimilarity(M.vocabulary || M.word);
		}
		render();
	});

	$('#pronunciation').mouseenter(pronunceWord);

	chrome.runtime.getBackgroundPage(function(backgroundPage) {
		var word = backgroundPage.selectWord;
		// $('#queryword').prop("placeholder", word);
		$('#queryword').val(word);
		onQuery();
	});

});

$(window).unload(function() {
});



