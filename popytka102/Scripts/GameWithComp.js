// JavaScript source code
;
'use strict';

(new function () {
    var App = this;
    this.files = ['js/lib.js', 'js/AppModel.js', 'js/AppView.js', 'js/AppController.js', 'js/MouseController.js'];
    this.model;
    this.view;
    this.controller;

    this.init = function () {
        this.model = new AppModel();
        this.view = new AppView(this.model);
        this.controller = new AppController(this.model, this.view);
    };

    return function () {
        var head = document.getElementsByTagName('head')[0];
        for (var i in App.files) {
            var script = document.createElement('script');
            script.src = App.files[i];
            script.onload = App.start;
            head.appendChild(script);
        }
        window.onload = App.init;
    };
})();
var AppController = function (model, view) {
    var AppController = this;
    this.model = model;
    this.view = view;

    this.init = function () {
        AppController.mouse = new MouseController(view.canvas, AppController.move, AppController.click);
        AppController.newGame(2);
        AppController.view.inputNewGameX.onclick = function () {
            AppController.newGame(1);
        };
        AppController.view.inputNewGameO.onclick = function () {
            AppController.newGame(2);
        };
    };

    this.newGame = function (a) {
        this.view.renderBoard();
        this.model.setStartData(a);
        if (a === 2)
            this.moveAI();
    };

    this.moveAI = function () {
        var nm = model.moveAI();
        this.view.renderMove(nm);
        if (!this.model.playing)
            this.view.renderWinLine();
    };

    this.moveUser = function () {
        if (!this.model.emptyCell())
            return;
        var nm = this.model.moveUser();
        this.view.renderMove(nm);
        this.view.setStyleCursorDefault();
        if (!this.model.playing)
            this.view.renderWinLine();
        else
            this.moveAI();
    };

    this.move = function (x, y) {
        if (!AppController.model.playing)
            return;
        AppController.nm = AppController.view.setStyleCursor(x, y);
        AppController.model.setNM(AppController.nm);
    };

    this.click = function () {
        if (!AppController.model.playing)
            return;
        AppController.moveUser();
    };

    this.init();
};
var AppModel = function () {
    this.m; // Номер ячейки по горизонтали (номер столбца)
    this.n; // Номер ячейки по вертикали (номер строки)
    this.size = 15; // Размер поля (15х15 ячеек)
    this.who; // Логическая переменная - кто сейчас ходит: true - X, false - O
    this.matrix; // Матрица игрового поля 15х15. 0 - свободная клетка, 1 - крестик, 2 - нолик
    this.freeCells; // Количество свободных ячеек. В начале каждой игры = 225
    this.hashStep; // Хеш-массив потенциальных ходов
    this.playing; // True - игра в процессе игры (пользователь может кликать на поле и т.д.)
    this.winLine; // Координаты победной линии
    this.prePattern = [ // Шаблоны построения фигрур и их веса. Х в дальнейшем заменяется на крестик (1) или нолик (0), 0 - свободная ячейка
        { s: 'xxxxx', w: 99999 }, // пять в ряд (финальная выигрышная линия)
        { s: '0xxxx0', w: 7000 }, // Открытая четверка
        { s: '0xxxx', w: 4000 }, // Закрытая четверка
        { s: 'xxxx0', w: 4000 },
        { s: '0x0xxx', w: 2000 },
        { s: '0xx0xx', w: 2000 },
        { s: '0xxx0x', w: 2000 },
        { s: 'xxx0x0', w: 2000 },
        { s: 'xx0xx0', w: 2000 },
        { s: 'x0xxx0', w: 2000 },
        { s: '0xxx0', w: 3000 },
        { s: '0xxx', w: 1500 },
        { s: 'xxx0', w: 1500 },
        { s: '0xx0x', w: 800 },
        { s: '0x0xx', w: 800 },
        { s: 'xx0x0', w: 800 },
        { s: 'x0xx0', w: 800 },
        { s: '0xx0', w: 200 }
    ];
    this.pattern = [[], [], []]; // Массив шаблонов для Х и 0, генерируется из предыдущих шаблонов
    this.patternWin = [0, /(1){5}/, /(2){5}/, /[01]*7[01]*/, /[02]*7[02]*/]; // Массив выигрышных шаблонов [1] и [2] и шаблон определения возможности поставить 5 в ряд
    this.directions = []; // Направления расчета потенциальных ходов
    this.step = 0; // Счетчик ходов игры

    this.init = function () {
        var s;
        var a;
        var l;
        var target = 'x';
        var pos;
        for (var i in this.prePattern) // Заполнение массива шаблонов построений фигур для крестиков (1) и ноликов (2)
        {
            s = this.prePattern[i].s;
            pos = -1;
            a = [];
            while ((pos = s.indexOf(target, pos + 1)) !== -1) {
                a[a.length] = s.substr(0, pos) + '7' + s.substr(pos + 1);
            }
            s = a.join('|');

            l = this.pattern[0].length;
            this.pattern[0][l] = this.prePattern[i].w;              // Веса шаблонов
            this.pattern[1][l] = new RegExp(s.replace(/x/g, '1'));  // Шаблоны для Х, например 01110 - открытая четверка
            this.pattern[2][l] = new RegExp(s.replace(/x/g, '2'));  // Аналогично для 0 - 022220

        }
        for (var n = -2; n <= 2; n++) // Заполнение массива потенциальных ходов (в радиусе 2 клеток)
        {                             // и установка минимальных весов (используются для расчета первых ходов, пока не появятся шаблоны)
            for (var m = -2; m <= 2; m++) {
                if (n === 0 && m === 0)
                    continue;
                if (Math.abs(n) <= 1 && Math.abs(m) <= 1)
                    this.directions.push({ n: n, m: m, w: 3 });
                else if (Math.abs(n) === Math.abs(m) || n * m === 0)
                    this.directions.push({ n: n, m: m, w: 2 });
                else
                    this.directions.push({ n: n, m: m, w: 1 });
            }
        }
    };

    this.setStartData = function (a) { // Начальные установки для каждой новой игры
        this.who = true;
        this.matrix = [];
        this.winLine = [];
        this.hashStep = { 7: { 7: { sum: 0, attack: 1, defence: 0, attackPattern: 0, defencePattern: 0 } } }; // первый шаг, если АИ играет за Х
        this.freeCells = this.size * this.size;
        for (var n = 0; n < this.size; n++) {
            this.matrix[n] = [];
            for (var m = 0; m < this.size; m++) {
                this.matrix[n][m] = 0;
            }
        }
        this.step = 0;
        this.playing = true;
        if (a === 2)
            console.log('New Game! X - AI, O - user');
        else
            console.log('New Game! X - user, O - AI');
    };

    this.setNM = function (a) { // Установка координат текущего хода
        this.n = a.n;
        this.m = a.m;
    };

    this.emptyCell = function () { // Проверка ячейки на доступность для хода
        return this.matrix[this.n][this.m] === 0;
    };

    this.moveUser = function () { // Ход пользователя
        this.playing = false;    // Запрещаем кликать, пока идет расчет
        return this.move(this.n, this.m, false);
    };

    this.moveAI = function () { // Ход АИ
        this.playing = false;
        var n, m;
        var max = 0;
        this.calculateHashMovePattern(); // Расчет весов по заданным шаблонам ходов
        for (n in this.hashStep)         // Поиск веса лучшего хода
            for (m in this.hashStep[n])
                if (this.hashStep[n][m].sum > max)
                    max = this.hashStep[n][m].sum;
        var goodmoves = [];
        for (n in this.hashStep)         // Поиск лучших ходов (если их несколько)
            for (m in this.hashStep[n])
                if (this.hashStep[n][m].sum === max) {
                    goodmoves[goodmoves.length] = { n: parseInt(n), m: parseInt(m) };
                }
        var movenow = goodmoves[getRandomInt(0, goodmoves.length - 1)]; // Выбор хода случайным образом, если несколько ходов на выбор
        this.n = movenow.n;
        this.m = movenow.m;
        return this.move(this.n, this.m, true);
    };

    this.move = function (n, m, aiStep) { // Ход (АИ или пользователя)
        if (this.hashStep[n] && this.hashStep[n][m])
            delete this.hashStep[n][m];  // Если поле хода было в массиве потенциальных ходов, то поле удаляется из него
        this.matrix[n][m] = 2 - this.who; // Сохранение хода в матрице полей игры
        this.who = !this.who; // Переход хода от Х к О, от О к Х
        this.freeCells--;
        var t = this.matrix[this.n][this.m]; // Далее идет проверка на выигрыш в результате этого хода: поиск 5 в ряд по 4 направлениям | — / \
        var s = ['', '', '', ''];
        var nT = Math.min(this.n, 4);
        var nR = Math.min(this.size - this.m - 1, 4);
        var nB = Math.min(this.size - this.n - 1, 4);
        var nL = Math.min(this.m, 4);
        for (var j = this.n - nT; j <= this.n + nB; j++)
            s[0] += this.matrix[j][this.m];
        for (var i = this.m - nL; i <= this.m + nR; i++)
            s[1] += this.matrix[this.n][i];
        for (var i = -Math.min(nT, nL); i <= Math.min(nR, nB); i++)
            s[2] += this.matrix[this.n + i][this.m + i];
        for (var i = -Math.min(nB, nL); i <= Math.min(nR, nT); i++)
            s[3] += this.matrix[this.n - i][this.m + i];
        var k;
        if ((k = s[0].search(this.patternWin[t])) >= 0)
            this.winLine = [this.m, this.n - nT + k, this.m, this.n - nT + k + 4];
        else if ((k = s[1].search(this.patternWin[t])) >= 0)
            this.winLine = [this.m - nL + k, this.n, this.m - nL + k + 4, this.n];
        else if ((k = s[2].search(this.patternWin[t])) >= 0)
            this.winLine = [this.m - Math.min(nT, nL) + k, this.n - Math.min(nT, nL) + k, this.m - Math.min(nT, nL) + k + 4, this.n - Math.min(nT, nL) + k + 4];
        else if ((k = s[3].search(this.patternWin[t])) >= 0)
            this.winLine = [this.m - Math.min(nB, nL) + k, this.n + Math.min(nB, nL) - k, this.m - Math.min(nB, nL) + k + 4, this.n + Math.min(nB, nL) - k - 4, -1];
        this.playing = (this.freeCells !== 0 && this.winLine.length === 0); 
        // Проверка на окончание игры (победа или нет свободных ячеек)
        if (this.playing)
            this.calculateHashMove(aiStep); // Рассчитываем веса потенциальных ходов (без шаблонов)
        console.log(++this.step + ': ' + n + ', ' + m);
        window.alert("КОНЕЦ! ВЫ ПРОИГРАЛИ!!!")
        return { n: n, m: m };
    };

    this.calculateHashMove = function (attack) { // Расчет весов потенциальных ходов (без шаблонов), просто по количеству Х и О рядом (акуально в начале игры)
        for (var key in this.directions) {
            var n = this.n + this.directions[key].n;
            var m = this.m + this.directions[key].m;
            if (n < 0 || m < 0 || n >= this.size || m >= this.size)
                continue;
            if (this.matrix[n][m] !== 0)
                continue;
            if (!(n in this.hashStep))
                this.hashStep[n] = {};
            if (!(m in this.hashStep[n]))
                this.hashStep[n][m] = { sum: 0, attack: 0, defence: 0, attackPattern: 0, defencePattern: 0 };
            if (attack)
                this.hashStep[n][m].attack += this.directions[key].w;
            else
                this.hashStep[n][m].defence += this.directions[key].w;
        }
    };

    this.calculateHashMovePattern = function () { // Расчет весов потенциальных ходов по заданным шаблонам
        var s;
        var k = 0;
        var attack = 2 - this.who;
        var defence = 2 - !this.who;
        var res;
        for (n in this.hashStep)
            for (m in this.hashStep[n]) // Перебор всех потенциальных ходов (*1)
            {
                this.hashStep[n][m].sum = this.hashStep[n][m].attack + this.hashStep[n][m].defence;
                this.hashStep[n][m].attackPattern = 0; // Обнуляем значение атаки по шаблону
                this.hashStep[n][m].defencePattern = 0; // Обнуляем значение защиты по шаблону
                n = parseInt(n);
                m = parseInt(m);
                for (var q = 1; q <= 2; q++) // Первым проходом расчитываем веса атаки, вторым - веса защиты
                    for (var j = 1; j <= 4; j++) {
                        s = '';
                        for (var i = -4; i <= 4; i++) // Циклы перебора в радиусе 4 клеток от рассматриваемого хода (выбраннного в *1)
                            switch (j) { // Создание строк с текущим состоянием клеток по 4 направлениям, такого вида 000172222
                                case 1:  // где 7 - это рассматриваемый ход, 0 - свободная ячейка, 1 - крестик, 2 - нолик
                                    if (n + i >= 0 && n + i < this.size)
                                        s += (i === 0) ? '7' : this.matrix[n + i][m];
                                    break;
                                case 2:
                                    if (m + i >= 0 && m + i < this.size)
                                        s += (i === 0) ? '7' : this.matrix[n][m + i];
                                    break;
                                case 3:
                                    if (n + i >= 0 && n + i < this.size)
                                        if (m + i >= 0 && m + i < this.size)
                                            s += (i === 0) ? '7' : this.matrix[n + i][m + i];
                                    break;
                                case 4:
                                    if (n - i >= 0 && n - i < this.size)
                                        if (m + i >= 0 && m + i < this.size)
                                            s += (i === 0) ? '7' : this.matrix[n - i][m + i];
                                    break;
                            }
                        res = (q === 1) ? this.patternWin[2 + attack].exec(s) : this.patternWin[2 + defence].exec(s);
                        if (res === null)
                            continue;
                        if (res[0].length < 5) // Если длина возможной линии <5, то построить 5 не удастся в принципе и расчет можно не производить
                            continue;          // например, при восходящей диагонали для ячейки (0, 0) или (0, 1) или если с 2х сторон зажал соперник
                        if (q === 1) // для крестиков, если играем крестиками и наоборот. Формируем вес атаки на этом поле
                            for (var i in this.pattern[attack]) { // перебор по всем шаблонам
                                if (this.pattern[attack][i].test(s)) // если нашли соответствие
                                    this.hashStep[n][m].attackPattern += this.pattern[0][i]; // увеличиваем значимость клетки на вес шаблона
                            }
                        else // для ноликов если играем крестиками
                            for (var i in this.pattern[defence])
                                if (this.pattern[defence][i].test(s))
                                    this.hashStep[n][m].defencePattern += this.pattern[0][i];
                    }
                this.hashStep[n][m].sum += 1.1 * this.hashStep[n][m].attackPattern + this.hashStep[n][m].defencePattern; // Атака на 10% важнее защиты
                k++;
            }
    };

    this.init();
};
var AppView = function (model) {
    var AppView = this;
    this.model = model;
    this.canvas;
    this.ctx;
    this.inputNewGameX;
    this.inputNewGameO;
    this.cellsize = 40, this.halfcellsize = 20, this.radius = 12, this.cross = 10, this.crosswin = 15;
    this.color = { canvas: '#ECEABE', border: 'silver', winline: '#6A5D4D' };
    this.init = function () {
        var body = document.getElementsByTagName('body')[0];
        var div = document.createElement('div');
        div.className = 'scoreboard';
        body.appendChild(div);
        var element = document.createElement('input');
        element.type = 'button';
        element.value = 'New game for X';
        div.appendChild(element);
        AppView.inputNewGameX = element;
        element = document.createElement('span');
        element.innerHTML = ' or ';
        div.appendChild(element);
        element = document.createElement('input');
        element.type = 'button';
        element.value = 'New game for O';
        div.appendChild(element);
        AppView.inputNewGameO = element;
        div = document.createElement('div');
        div.className = 'gameboard';
        body.appendChild(div);
        var canvas = document.createElement('canvas');
        div.appendChild(canvas);
        AppView.canvas = canvas;
        AppView.ctx = AppView.canvas.getContext('2d');
        AppView.canvas.height = 601;
        AppView.canvas.width = 601;
    };

    this.renderBoard = function () {
        this.ctx.fillStyle = this.color.canvas;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.width);
        this.ctx.beginPath();
        this.ctx.strokeStyle = this.color.border;
        this.ctx.lineWidth = 1;
        for (var x = 0.5; x < this.canvas.width; x += this.cellsize) {
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
        }
        for (var y = 0.5; y < this.canvas.height; y += this.cellsize) {
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
        }
        this.ctx.stroke();
    };

    this.renderMove = function (nm) {
        n = nm.n || this.model.n;
        m = nm.m || this.model.m;
        if (this.model.matrix[n][m] === 1)
            this.renderX(n, m);
        else
            this.renderO(n, m);
        //this.renderMoveHash();
    };

    this.renderMoveHashLable = function (n, m, text, dx, dy) {
        var x = m * this.cellsize + dx * this.halfcellsize / 4;
        var y = n * this.cellsize + dy * this.halfcellsize / 4;
        var ctx = this.ctx;
        var color = this.color;
        ctx.fillStyle = color.canvas;
        ctx.fillRect(x, y, 10, 10);
        ctx.fillStyle = color.border;
        ctx.textBaseline = 'top';
        ctx.fillText(text, x, y);
    };

    this.renderMoveHash = function () {
        for (var n in this.model.hashStep)
            for (var m in this.model.hashStep[n]) {
                this.renderMoveHashLable(n, m, this.model.hashStep[n][m].sum, 1, 1);
                this.renderMoveHashLable(n, m, this.model.hashStep[n][m].attack, 1, 3);
                this.renderMoveHashLable(n, m, this.model.hashStep[n][m].defence, 6, 3);
                this.renderMoveHashLable(n, m, this.model.hashStep[n][m].attackPattern, 1, 6);
                this.renderMoveHashLable(n, m, this.model.hashStep[n][m].defencePattern, 6, 6);
            }
    };

    this.renderWinLine = function () {
        var ctx = this.ctx;
        var cellsize = this.cellsize;
        var halfcellsize = this.halfcellsize;
        var crosswin = this.crosswin;
        var m1 = this.model.winLine[0];
        var n1 = this.model.winLine[1];
        var m2 = this.model.winLine[2];
        var n2 = this.model.winLine[3];
        r = this.model.winLine[4] || 1;
        ctx.beginPath();
        ctx.strokeStyle = this.color.winline;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.moveTo(m1 * cellsize + halfcellsize - crosswin * (m1 !== m2), n1 * cellsize + halfcellsize - crosswin * (n1 !== n2) * r);
        ctx.lineTo(m2 * cellsize + halfcellsize + crosswin * (m1 !== m2), n2 * cellsize + halfcellsize + crosswin * (n1 !== n2) * r);
        ctx.stroke();
        
    };

    this.renderX = function (n, m) {
        var ctx = this.ctx;
        ctx.beginPath();
        var x = m * this.cellsize + this.halfcellsize;
        var y = n * this.cellsize + this.halfcellsize;
        ctx.fillStyle = this.color.canvas;
        ctx.fillRect(x - this.halfcellsize + 1, y - this.halfcellsize + 1, this.cellsize - 2, this.cellsize - 2);
        ctx.strokeStyle = '#C1876B';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.moveTo(x - this.cross, y - this.cross);
        ctx.lineTo(x + this.cross, y + this.cross);
        ctx.moveTo(x - this.cross, y + this.cross);
        ctx.lineTo(x + this.cross, y - this.cross);
        ctx.stroke();
    };

    this.renderO = function (n, m) {
        var ctx = this.ctx;
        ctx.beginPath();
        var x = m * this.cellsize + this.halfcellsize;
        var y = n * this.cellsize + this.halfcellsize;
        ctx.fillStyle = this.color.canvas;
        ctx.fillRect(x - this.halfcellsize + 1, y - this.halfcellsize + 1, this.cellsize - 2, this.cellsize - 2);
        ctx.strokeStyle = '#BEBD7F';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.arc(x, y, this.radius, 0, 2 * Math.PI);
        ctx.stroke();
    };

    this.setStyleCursor = function (x, y) {
        var n = Math.floor(y / this.cellsize);
        var m = Math.floor(x / this.cellsize);
        if (n < this.model.size && m < this.model.size && this.model.matrix[n][m] === 0)
            this.canvas.style.cursor = 'pointer';
        else
            this.canvas.style.cursor = 'default';
        return { n: n, m: m };
    };

    this.setStyleCursorDefault = function () {
        this.canvas.style.cursor = 'default';
    };

    this.init();
};
var GameLocation = function () {
    this.m; // Номер ячейки по горизонтали (номер столбца)
    this.n; // Номер ячейки по вертикали (номер строки)
    this.size = 15; // Размер поля (15х15 ячеек)
    this.matrix; // Матрица игрового поля 15х15. 0 - свободная клетка, 1 - крестик, 2 - нолик
    this.potentialMove; // Хеш-массив потенциальных ходов
    this.oldN; // Номер ячейки по горизонтали (номер столбца)
    this.oldM; // Номер ячейки по вертикали (номер строки)
    this.oldPotentialMove;
    this.goodMoves;
    this.pattern;

    this.init = function (pattern) {
        this.pattern = pattern;
    };

    this.start = function () { // Начальные установки для каждой новой игры
        this.matrix = [];
        this.potentialMove = {};
        for (var n = 0; n < this.size; n++) {
            this.matrix[n] = [];
            for (var m = 0; m < this.size; m++)
                this.matrix[n][m] = 0;
        }
        this.oldN = -1;
        this.oldM = -1;
    };

    this.setFirstPotentialMove = function () {
        this.potentialMove = { 7: { 7: { sum: 0, attack: 0, defence: 0 } } };
    };

    this.setNM = function (a) { // Установка координат текущего хода (в номерах ячеек)
        this.n = a[0];
        this.m = a[1];
    };

    this.emptyCell = function (a, b) { // Проверка ячейки на доступность для хода
        var n = a || this.n;
        var m = b || this.m;
        return this.matrix[n][m] === 0;
    };

    this.getGoodMoves = function () {
        var hs = this.potentialMove;
        var max = 0;
        var n, m;
        var goodMoves = [];
        for (n in hs)         // Поиск веса лучшего хода
            for (m in hs[n])
                if (hs[n][m].sum > max)
                    max = hs[n][m].sum;
        max = 0.9 * max; // Берем не только самый лучший ход, а несколько из лучших (в пределах 10% по значению важности)
        for (n in hs)
            for (m in hs[n])
                if (hs[n][m].sum >= max)
                    goodMoves[goodMoves.length] = [parseInt(n), parseInt(m)];
        this.goodMoves = goodMoves;
        return goodMoves;
    };

    this.getRandomGoodMove = function () {
        var goodMoves = this.getGoodMoves();
        return goodMoves[getRandomInt(0, goodMoves.length - 1)]; // Выбор хода случайным образом из лучших
    };

    this.saveMove = function (n, m, xo) {
        this.matrix[n][m] = xo;
    };

    this.updatePotentialMove = function (n, m) {
        var hs = this.potentialMove;
        if (hs[n] && hs[n][m])
            delete hs[n][m]; // Если поле хода было в массиве потенциальных ходов, то поле удаляется из него
        var nd, md;
        for (var i = -2; i <= 2; i++)
            for (var j = -2; j <= 2; j++) {
                nd = i + n;
                md = j + m;
                if (nd < 0 || md < 0 || nd >= this.size || md >= this.size)
                    continue;
                if (this.matrix[nd][md] !== 0)
                    continue;
                if (!(nd in hs))
                    hs[nd] = {};
                if (!(md in hs[nd]))
                    hs[nd][md] = { sum: 0, attack: 0, defence: 0 };
            }
        this.potentialMove = hs;
    };

    this.getOneSymbol = function (i, n, m, test) {
        if (n >= 0 && m >= 0 && n < this.size && m < this.size)
            return (test && i === 0) ? '7' : this.matrix[n][m];
    };

    this.getLine = function (j, n, m, test) {
        var s;
        for (var i = -4; i <= 4; i++) // Цикл перебора на расстоянии +/- 4 клеток от рассматриваемой
            if (j === 1)
                s += this.getOneSymbol(i, n + i, m, test);
            else if (j === 2)
                s += this.getOneSymbol(i, n, m + i, test);
            else if (j === 3)
                s += this.getOneSymbol(i, n + i, m + i, test);
            else
                s += this.getOneSymbol(i, n - i, m + i, test);
    };

    this.getAllLines = function (n, m, a) { // Получение 4 линий:  | — \ /
        var test = a || false;
        var lines = [];
        for (var j = 1; j <= 4; j++)
            lines[lines.lenght] = getLine(j, n, m, test);
        return lines;
    };

    this.getLines = function (n, m, a) { // Получение 4 линий:  | — \ /  -- оптимизированный аналог getAllLines
        var test = a || false;
        var nT = Math.min(n, 4);
        var nR = Math.min(this.size - m - 1, 4);
        var nB = Math.min(this.size - n - 1, 4);
        var nL = Math.min(m, 4);
        var lines = ['', '', '', ''];//[['', 1, n - nT, m], ['', 1, n, m - nL], ['', 3, n - Math.min(nT, nL), m - Math.min(nT, nL)], ['', 4, n + Math.min(nB, nL), m - Math.min(nB, nL)]];

        for (var j = n - nT; j <= n + nB; j++)
            lines[0] += (test && j === n) ? '7' : this.matrix[j][m];
        for (var i = m - nL; i <= m + nR; i++)
            lines[1] += (test && i === m) ? '7' : this.matrix[n][i];
        for (var i = -Math.min(nT, nL); i <= Math.min(nR, nB); i++)
            lines[2] += (test && i === 0) ? '7' : this.matrix[n + i][m + i];
        for (var i = -Math.min(nB, nL); i <= Math.min(nR, nT); i++)
            lines[3] += (test && i === 0) ? '7' : this.matrix[n - i][m + i];
        return lines;
    };

    this.calculatePotentialMovePattern = function (xAI) { // Расчет весов потенциальных ходов по заданным шаблонам
        var hs = this.potentialMove;
        var s;
        var weight1;
        var weight2;
        var lines;
        for (n in hs)
            for (m in hs[n]) { // Перебор всех потенциальных ходов
                weight1 = 0;
                weight2 = 0;
                lines = this.getLines(parseInt(n), parseInt(m), true);
                for (var i in lines) {
                    s = lines[i];
                    if (s === this.pattern.emptyPatern)
                        continue;
                    if (this.pattern.isPossibleLine(1, s))
                        weight1 += this.pattern.getWeightPattern(1, s);
                    if (this.pattern.isPossibleLine(2, s))
                        weight2 += this.pattern.getWeightPattern(2, s);
                }
                if (xAI) { // если AI играет за X
                    hs[n][m].attack = weight1;
                    hs[n][m].defence = weight2;
                } else {
                    hs[n][m].attack = weight2;
                    hs[n][m].defence = weight1;
                }
                //if (hs[n][m].defence < 20)
                //    hs[n][m].defence = 0;
                hs[n][m].sum = hs[n][m].attack + hs[n][m].defence; // Атака предпочтительнее дефа
            }
        this.potentialMove = hs;
    };
};
var GamePattern = function () {
    this.prePattern = [ // Шаблоны построения фигур и их веса. "x" в дальнейшем заменяется на крестик (1) или нолик (2), 0 - свободная ячейка
        { w: 10000, p: ['xxxxx'] }, // Пять в ряд. Победа
        { w: 1000, p: ['0xxxx0'] }, // Открытая четверка. Один ход до победы, 100% победа (соперник не может закрыть одним ходом)
        { w: 500, p: ['xxxx0'] }, // Полузакрытая четверка. Один ход до победы, но соперник может заблокировать
        { w: 400, p: ['x0xxx', 'xx0xx'] }, // Четверка с брешью. Один ход до победы, но соперник может заблокировать
        { w: 100, p: ['00xxx000'] }, // Открытая тройка (как 2 полузакрытых)
        { w: 80, p: ['00xxx00'] }, // Открытая тройка (как 2 полузакрытых)
        { w: 75, p: ['0xxx00'] }, // Открытая тройка (как 2 полузакрытых)
        { w: 50, p: ['0xxx0', 'xxx00'] }, // Полузакрытая тройка
        { w: 25, p: ['x0xx0', 'xx0x0', 'x00xx'] }, // Тройка с брешью
        { w: 10, p: ['000xx000'] }, // Открытая двойка
        { w: 5, p: ['0xx0'] } // Открытая двойка
    ];
    this.pattern = [[], [], []]; // Массив шаблонов для Х и 0, генерируется из предыдущих шаблонов. Вес, для X, для O
    this.winnerLine = ['', /(1){5,}/, /(2){5,}/]; // Выигрышный шаблон, 1 - для Х, 2 - для О
    this.possibleLine = ['', /[01]*7[01]*/, /[02]*7[02]*/]; // Шаблон определения возможности поставить 5 в ряд (если длина линии будет >=5)
    this.emptyPatern = '000070000'; // Шаблон "пустой строки" бессмысленной для анализа

    this.init = function () {
        var s, a, l;
        for (var i in this.prePattern)
            for (var j in this.prePattern[i].p) { // Заполнение массива шаблонов построений фигур для крестиков (1) и ноликов (2)
                s = this.prePattern[i].p[j];
                a = replace7x(s);
                if ((s2 = reverseString(s)) !== s)
                    a = a.concat(replace7x(s2));
                s = '(' + a.join('|') + ')';
                l = this.pattern[0].length;
                this.pattern[0][l] = this.prePattern[i].w; // Веса шаблонов
                this.pattern[1][l] = new RegExp(s.replace(/x/g, '1')); // Шаблоны для Х, например 01110 - открытая четверка
                this.pattern[2][l] = new RegExp(s.replace(/x/g, '2')); // Аналогично для 0 - 022220
            }
    };

    this.isWinnerLine = function (xo, s) {
        return s.search(this.winnerLine[xo]) !== -1;
    };

    this.getWinnerLine = function (xo, s) {
        var start = s.search(this.winnerLine[xo]);
        if (start === -1)
            return false;
        window.alert("КОНЕЦ! ВЫ ПРОИГРАЛИ!!!");
        return [start, this.winnerLine[xo].exec(s)[0].length];
    };

    this.getLengthWinnerLine = function (xo, s) 
        window.alert("КОНЕЦ! ВЫ ПРОИГРАЛИ!!!");
        return this.winnerLine[xo].exec(s)[0].length;
    };

    this.isPossibleLine = function (xo, s) {
        var r = this.possibleLine[xo].exec(s);
        if (r !== null)
            return r[0].length >= 5;
        return false;
    };

    this.getWeightPattern = function (xo, s) {
        var w = 0;
        for (var i in this.pattern[xo]) // перебор по всем шаблонам
            if (this.pattern[xo][i].test(s)) { // если нашли соответствие
                w += this.pattern[0][i];
                break;
            }
        return w;
    };

    this.init();
};
function MouseController(element, move, click) {
    var MouseController = this;
    this.x = 0;
    this.y = 0;
    this.element = element;
    this.moveApp = move;
    this.clickApp = click;

    this.move = function (e) {
        this.x = e.pageX - this.element.offsetLeft;
        this.y = e.pageY - this.element.offsetTop;
        this.moveApp(this.x, this.y);
    };

    this.click = function () {
        this.clickApp(this.x, this.y);
    };

    this.element.addEventListener('mousemove', function (e) {
        MouseController.move(e);
    });

    this.element.addEventListener('click', function (e) {
        MouseController.click(e);
    });
}
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function reverseString(s) {
    var str = '';
    for (var i = s.length - 1; i >= 0; i--)
        str += s[i];
    return str;
}

function replace7x(s) {
    var a = [], pos = -1;
    while ((pos = s.indexOf('x', pos + 1)) !== -1) {
        a[a.length] = s.substr(0, pos) + '7' + s.substr(pos + 1);
    }
    return a;
}

function cloneObject(obj) {
    var newObj = {};
    for (var prop in obj) {
        if (typeof obj[prop] === 'object') {
            newObj[prop] = cloneObject(obj[prop]);
        } else {
            newObj[prop] = obj[prop];
        }
    }
    return newObj;
}

function createElement(name, attributes) {
    var el = document.createElement(name);
    if (typeof attributes === 'object') {
        for (var i in attributes) {
            el.setAttribute(i, attributes[i]);
            if (i.toLowerCase() === 'class') {
                el.className = attributes[i]; // for IE compatibility

            } else if (i.toLowerCase() === 'style') {
                el.style.cssText = attributes[i]; // for IE compatibility
            }
        }
    }
    for (var i = 2; i < arguments.length; i++) {
        var val = arguments[i];
        if (typeof val === 'string') {
            val = document.createTextNode(val);
        }
        el.appendChild(val);
    }
    return el;
}

function getMiddleColor(a, b, c) {
    var percent = a || 0;
    var startColor = b || '#fafafa';
    var finishColor = c || '#FF0000';
    var aRGBStart = startColor.replace('#', '').match(/.{2}/g);
    var aRGBFinish = finishColor.replace('#', '').match(/.{2}/g);
    var finishPercent = percent;
    var startPercent = 1 - finishPercent;
    var R, G, B;
    var R = Math.floor(('0x' + aRGBStart[0]) * startPercent + ('0x' + aRGBFinish[0]) * finishPercent);
    var G = Math.floor(('0x' + aRGBStart[1]) * startPercent + ('0x' + aRGBFinish[1]) * finishPercent);
    var B = Math.floor(('0x' + aRGBStart[2]) * startPercent + ('0x' + aRGBFinish[2]) * finishPercent);
    return 'rgb(' + R + ',' + G + ',' + B + ')';
}
