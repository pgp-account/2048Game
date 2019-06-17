(function (window,document,$){
    function Game2048(opt){
		var prefix = opt.prefix,
        len = opt.len,
        size = opt.size,
		margin = opt.margin;
		
		//初始分数
		var score = 0;
		//胜利条件
		var winNum = 2048;
		//调用start（）前游戏处于停止状态
		var isGameOver = true;

        //创建View对象，用于处理游戏的页面效果
        var view = new View(prefix,len,size,margin);
        //测试创建单元格功能
        view.init();
        //测试初始赋值功能
        var board = new Board(len);
        //board.init();
        //console.log(board.arr);
        //测试生成两个随机数
        board.onGenerate = function(e){
            //console.log(e);
            view.addNum(e.x,e.y,e.num);
        };
        // board.generate();
        // board.generate();
        //测试左移效果
        // board.arr = [[0,0,0,2],[0,2,0,2],[2,2,2,2],[0,2,4,0]];
        // board.moveRight();
        // console.log(board.arr);

        
        board.onMove = function(e){
            
			//判断是否发生合并，设置游戏分数(合并后的值进行累加)
            if(e.to.num > e.from.num){
                score += e.to.num;
                view.updateScore(score);
			}
			//判断胜利
			if(e.to.num >= winNum){
				isGameOver = true;
				//设置延迟，可以等待移动单元格动画结束后再出现
				setTimeout(function(){
					// alert('您获胜了！');
					//完善体验
					view.win();
				},300);
			}
			//每当board.arr中的单元格移动时，调用此方法控制页面中的单元格移动
			view.move(e.from,e.to);
			
        };
        board.onMoveComplete = function(e){
            if(e.moved){
                setTimeout(function(){
                    board.generate();
                },200);
			}
			//判断是否失败
			if(!board.canMove()){
				isGameOver = true;
				setTimeout(function(){
					// alert('本次得分：'+score);
					view.over(score);
				},300);
			}
        };
        //键盘按下事件
        $(document).keydown(function(e){
			//游戏结束后不能在移动单元格
			if(isGameOver){
				return false;		
			}
            switch(e.which){
                case 37:board.moveLeft();break; //左移
                case 38:board.moveUp();break;   //上移
                case 39:board.moveRight();break;//右移
                case 40:board.moveDown();break;//下移
            }
		});

		function start(){
			//将保存的分数重置为0
			score = 0;
			//将页面中的分数重置为0
			view.updateScore(0);
			//清空页面中多余的数字单元格
			view.cleanNum();
			//初始化单元格数组
			board.init();
			//生成第一个数字
			board.generate();
			//生成第二个数字
			board.generate();
			//将游戏状态设为开始
			isGameOver = false;
		}

		//为“重新开始”按钮添加单击事件
		$('#' + prefix + '_restart').click(start);

		//页面打开后自动开始游戏
		start();
		
		
    };
    

    //页面视图
    function View(prefix,len,size,margin){
        //id或class前缀
        this.prefix = prefix;
        //棋盘单边单元格数量，总数量len*len
        this.len = len;
        //单元格边长，单元格大小为size*size
        this.size = size;
        //单元格间距
        this.margin = margin;
        //得到id为game_container的<div>元素
        this.container = $('#'+prefix+'_container');
        //计算边长，间隔算上两边共len+1
        var containerSize = len*size+margin*(len+1);
        this.container.css({width:containerSize,height:containerSize});
        //保存所有数字单元格对象
        this.nums = {};
        //获取显示分数的元素对象
        this.score = $('#'+prefix+'_score');
    }
    View.prototype = {
        //计算top和left
        getPos:function(n){
            return this.margin + n*(this.size + this.margin);
        },
        //根据len（棋盘单边单元格数量）自动生成空单元格，生成后加到game_container中
        init:function(){
            for(var x=0,len=this.len;x<len;++x){
                for(var y=0;y<len;++y){
                    var $cell = $('<div class="'+this.prefix+'-cell"></div>');
                    $cell.css({
                        width:this.size+'px',
                        height:this.size+'px',
                        top:this.getPos(x),
                        left:this.getPos(y)
                    }).appendTo(this.container);
                }
            }
        },
        //根据x,y,num显示数字单元格
        addNum:function(x,y,num){
            //<div class = "game-num game-num-2"></div>表示这个单元格按照数字2的格式展示
            var $num = $('<div class="'+this.prefix+'-num '+this.prefix+'-num-'+num+' "></div>');
            $num.text(num).css({
                //从中心位置展开
                top : this.getPos(x) +parseInt(this.size / 2),
                left : this.getPos(y) +parseInt(this.size / 2)
            }).appendTo(this.container).animate({
                //用动画效果展开到最终样式
                width:this.size+'px',
                height:this.size+'px',
                lineHeight:this.size + 'px',
                top:this.getPos(x),
                left:this.getPos(y)
            },100);
            //将新生成的数字单元格保存到this.nums中，保存的属性名为单元格在board.arr数组中的下标位置
            this.nums[x + '-' + y] = $num;
        },
        // 1.将this.nums中toIndex（目标对象下标）替换成fromIndex(被移动对象下标)，替换前，先用变量clean保存toIndex对象。替换后，clean是目标对象，toIndex和fromIndex是被移动对象
        // 2.删除this.nums中fromIndex属性，此时只有toIndex是被移动对象
        // 3.为toIndex对象设置动画，以200毫秒的过度时间移动到目标对象的位置
        // 4.动画执行结束后，判断当前是否为数字单元格合并操作，如果是，将clean单元格从页面中删除，并将toIndex单元格中的文本更改为新的数字，将class更新为新数字对应的样式
        move:function(from,to){
            //拼接成“x-y”形式的字符串，用于从this.nums中获取fromIndex(被移动对象下标)和toIndex（目标对象下标）
            var fromIndex = from.x  + '-' + from.y,
            toIndex = to.x + '-' + to.y;
            var clean = this.nums[toIndex];
            this.nums[toIndex] = this.nums[fromIndex];
            delete this.nums[fromIndex];
            var prefix = this.prefix + '-num-';
            var pos = {
                top:this.getPos(to.x),
                left:this.getPos(to.y)
            } ;
            //在调用animate()前先调用finish()结束前一个动画，避免使用键盘快速移动时，出现动画效果重叠
             this.nums[toIndex].finish().animate(pos,200,function(){
                if(to.num > from.num){
                    clean.remove();
                    $(this).text(to.num).removeClass(prefix+from.num).addClass(prefix+to.num);
                }
            });
        },
        //更新页面显示的分数
        updateScore:function(score){
            this.score.text(score);
		},
		//获胜情况
		win:function(){
			$('#' + this.prefix + '_over_info').html('<p>您获胜了</p>');
			$('#' + this.prefix + '_over').removeClass(this.prefix + '-hide');
		},
		//失败情况
		over:function(score){
			$('#' + this.prefix + '_over_info').html('<p>本次得分：</p><p>' + score + '</p>');
			$('#' + this.prefix + '_over').removeClass(this.prefix + '-hide');
		},

		//重新开始
		cleanNum:function(){
			//清空this.nums中保存的所有数字单元格对象
			this.nums = {};
			//隐藏游戏结束时的提示信息
			$('#' + this.prefix + '_over').addClass(this.prefix + '-hide');
			//移出页面中所有单元格
			$('.' + this.prefix + '-num').remove();
		}
    };


    //处理单元格中的数据
    function Board(len){
        this.len = len;
        this.arr = [];
    }
    Board.prototype = {
        //根据len创建二维数组，初始情况下所有单元格都为空，为每个格赋0
        init:function(){
            for(var arr=[],len=this.len,x=0 ; x<len ; ++x){
                arr[x] = [];
                for(var y=0 ; y<len ; ++y){
                    arr[x][y] = 0;
                }

            }
            this.arr = arr;
        },
        //游戏开始时会在棋盘格中的随机位置生成两个随机数字（2或4）
        //随机生成数字2或4，保存到数组的随机位置
        generate:function(){
            var empty = [];
            //查找数组中所有值为0的元素索引
            for(var x=0, arr=this.arr, len=arr.length; x<len; ++x){
                for(var y=0 ; y<len ; ++y){
                    if(arr[x][y] === 0){
                        empty.push({x:x,y:y});
                    }
                }
            }
            if(empty.length < 1){
                return false;
            }
            //确定位置，随机选取empty中的一个空单元格
            var pos = empty[Math.floor(Math.random()*empty.length)];
            //随机生成一个 2 或 4
            this.arr[pos.x][pos.y] = Math.random() < 0.5 ? 2 : 4;
            //将数字填到单元格中，由于Board 只处理数据，View处理页面，为让两对象联动，调用this.onGenerate触发事件，将新创建的单元格在二维数组中的位置和数字内容传递过去
            this.onGenerate({x : pos.x , y:pos.y, num:this.arr[pos.x][pos.y]})
        },
        //每当generate()方法被调用时，执行此方法
        onGenerate:function(){},

        //-----------左移--------------
        // 1.遍历数组，外层循环从上到下遍历数组行，内层循环从左到右遍历数组列
        // 2.在遍历数组第一行第一列时，向右依次查找1个非0单元格，如果找不到，跳转到第5步
        // 3.判断第一列是否为0，若果是，将找到的非0单元格移动到第一列，然后重复第二步
        // 4.判断第一列与找到的非0单元格数字是否相等，如果相等，则将第一列乘以2，然后将找到的非0单元格数字置为0，实现左移合并效果
        // 5.第一列的操作结束，进入第二列，类似第二步
        moveLeft:function(){
            //是否有单元格被移动
            var moved = false;
            //外层循环从上到下遍历“行” ，内层循环从左到右遍历“列”
            for(var x=0,len = this.arr.length ; x<len ; ++x){
                for(var y = 0,arr = this.arr[x];y<len;++y){
                    //从y+1 位置开始，向右查找
                    for(var next = y+1;next<len;++next){
                        //如果next单元格是0，找下一个不是0的单元格
                        if(arr[next] === 0){
                            continue;
                        }
                        //如果y单元格数字是0，则将next移动到y位置，然后将y减1 重新查找
                        if(arr[y] === 0 ){
                            arr[y] = arr[next];
                            this.onMove({
                                from:{x:x,y:next,num:arr[next]},
                                to:{x:x,y:y,num:arr[y]}
                            });
                            arr[next] = 0;
                            moved = true;
                            --y;
                        //如果y与next单元格数字相等，则将next移动并合并给y
                        }else if(arr[y] === arr[next]){
                            arr[y] *=2;
                            this.onMove({
                                from:{x:x,y:next,num:arr[next]},
                                to:{x:x,y:y,num:arr[y]}
                            });
                            arr[next] = 0;
                            moved = true;
                        }
                        //找到一个就break
                        break;
                    }
                }
            }
            this.onMoveComplete({moved:moved});
        },
        //移动时触发的事件
        onMove:function(){},
        //左移操作完成后触发的事件，参数（moved）是一个对象，表示本次操作是否发生过单元格移动，如果发生过，会在棋盘中自动添加一个新的随机数字单元格
        onMoveComplete:function(){},

        moveRight:function(){
            //是否有单元格被移动
            var moved = false;
            //外层循环从上到下遍历“行” ，内层循环从左到右遍历“列”
            for(var x=0,len = this.arr.length ; x<len ; ++x){
                for(var y = len-1,arr = this.arr[x];y>-1;--y){
                    //从y+1 位置开始，向右查找
                    for(var prev = y-1;prev>-1;--prev){
                        //如果next单元格是0，找下一个不是0的单元格
                        if(arr[prev] === 0){
                            continue;
                        }
                        //如果y单元格数字是0，则将next移动到y位置，然后将y减1 重新查找
                        if(arr[y] === 0 ){
                            arr[y] = arr[prev];
                            this.onMove({
                                from:{x:x,y:prev,num:arr[prev]},
                                to:{x:x,y:y,num:arr[y]}
                            });
                            arr[prev] = 0;
                            moved = true;
                            ++y;
                        //如果y与next单元格数字相等，则将next移动并合并给y
                        }else if(arr[y] === arr[prev]){
                            arr[y] *=2;
                            this.onMove({
                                from:{x:x,y:prev,num:arr[prev]},
                                to:{x:x,y:y,num:arr[y]}
                            });
                            arr[prev] = 0;
                            moved = true;
                        }
                        break;
                    }
                }
            }
            this.onMoveComplete({moved:moved});
        },
        moveUp: function() {
            var canMove = false;
            for (var arr = this.arr, len = arr.length, y = 0; y < len; ++y) {
              	for (var x = 0; x < len; ++x) {
                	for (var next = x + 1; next < len; ++next) {
                  		if (arr[next][y] === 0) {
                    		continue;
                  		}
						if (arr[x][y] === 0) {
							arr[x][y] = arr[next][y];
							this.onMove({from: {x: next, y: y, num: arr[next][y]}, to: {x: x, y: y, num: arr[x][y]}});
							arr[next][y] = 0;
							canMove = true;
							--x;
						} else if (arr[x][y] === arr[next][y]) {
							arr[x][y] += arr[next][y];
							this.onMove({from: {x: next, y: y, num: arr[next][y]}, to: {x: x, y: y, num: arr[x][y]}});
							arr[next][y] = 0;
							canMove = true;
						}
						break;
					}
            	}
        	}
            this.onMoveComplete({moved: canMove});
        },
        moveDown: function() {
            var canMove = false;
            for (var arr = this.arr, len = arr.length, y = 0; y < len; ++y) {
              	for (var x = len - 1; x >= 0; --x) {
                	for (var prev = x - 1; prev >= 0; --prev) {
                  		if (arr[prev][y] === 0) {
                    		continue;
                  		}
						if (arr[x][y] === 0) {
							arr[x][y] = arr[prev][y];
							this.onMove({from: {x: prev, y: y, num: arr[prev][y]}, to: {x: x, y: y, num: arr[x][y]}});
							arr[prev][y] = 0;
							canMove = true;
							++x;
						} else if (arr[x][y] === arr[prev][y]) {
							arr[x][y] += arr[prev][y];
							this.onMove({from: {x: prev, y: y, num: arr[prev][y]}, to: {x: x, y: y, num: arr[x][y]}});
							arr[prev][y] = 0;
							canMove = true;
						}
						break;
                	}
              	}
            }
            this.onMoveComplete({moved: canMove});
		},
		//判断游戏是否失败
		//失败条件：数字填满所有单元格，并且相邻单元格也无法合并
		//以左上角的单元格为基点，开始遍历。如果当前单元格为0，表示可以移动
		//如果相邻的右，下单元格与当前单元格数字相同，表示可以合并
		//如果遍历完成后仍没有符合条件的单元格，说明当前已经无法移动了
		canMove:function(){
			for(var x = 0,arr = this.arr,len = arr.length;x < len;++x){
				for(var y = 0;y < len;++y){
					if(arr[x][y] === 0){
						return true;
					}
					var curr = arr[x][y],
					right = arr[x][y+1];
					var down = arr[x+1] ? arr[x+1][y] : null;
					if(right === curr || down ===curr){
						return true;
					}
				}
			}
			return false;
		}
    };
	window['Game2048'] = Game2048;
})(window,document,jQuery);
//传入window,document,jQuery，表示该函数依赖这些全局变量