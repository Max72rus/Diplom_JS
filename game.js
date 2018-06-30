'use strict';

class Vector {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    
    plus(vector) {
        if (vector instanceof Vector) {
            return new Vector(this.x + vector.x, this.y + vector.y);
        }
        throw new Error('Можно прибавлять к вектору только вектор типа Vector');
    }

    times(num) {
      return new Vector(this.x * num, this.y * num);
    }
}

class Actor {
    constructor(position = new Vector(), size = new Vector(1, 1), speed = new Vector()) {
        if (!(position instanceof Vector) || !(size instanceof Vector) || !(speed instanceof Vector)) {
            throw new Error('Ошибка! Переданный объект не соответсвует класса Vector');
        }
        this.pos = position;
        this.size = size;
        this.speed = speed;
    }

    act() {};

    get type() {
        return 'actor';
    }

    get left() {
        return this.pos.x;
    }

    get right() {
        return this.pos.x + this.size.x;
    }

    get top() {
        return this.pos.y;
    }

    get bottom() {
        return this.pos.y + this.size.y;
    }

    isIntersect(obj) {
        if (!(obj instanceof Actor)) {
            throw new Error('Не является объектом класса Actor');
        }
        if (this === obj) {
            return false;
        } else {
            return (obj.left < this.right && obj.right > this.left) && (obj.top < this.bottom && obj.bottom > this.top);
        }
    }
}

class Level {
    constructor(grid = [], actors = []) {
        this.grid = grid;
        this.actors = actors;
        this.player = actors.find(actor => {
            return actor.type === 'player';
        });
        this.height = this.grid.length;
        this.width = this.grid.reduce(
            (maxx, currentItem) => maxx > currentItem.length ? maxx : currentItem.length, 0);
        this.status = null;
        this.finishDelay = 1;
    }

    isFinished() {
        return this.status !== null && this.finishDelay < 0;
    }
    
    actorAt(actor) {
        if (!(actor instanceof Actor)) {
            throw new Error('Тип объекта должен быть Actor');
        }
        if (!this.grid || this.actors.length === 1) {
            return;
        }
        if (this.actors.length) {
            for (let item of this.actors) {
                if (actor.isIntersect(item)) {
                    return item;
                }
            }
        }
    }
    
    obstacleAt(pos, size) {
        if (!(pos instanceof Vector) || !(size instanceof Vector)) {
            throw new Error('Можно прибавлять к вектору только вектор типа Vector');
        }
        if (pos.y + size.y > this.height) { return 'lava'; };
        if (pos.x < 0 || pos.x + size.x > this.width || pos.y < 0) {
            return 'wall';
        };
        if (this.grid.length) {
            for (let y = Math.floor(pos.y); y < Math.ceil(pos.y + size.y); y++) {
                for (let x = Math.floor(pos.x); x < Math.ceil(pos.x + size.x); x++) {
                    let position = this.grid[y][x];
                    if (position === 'lava' || position === 'wall') {
                        return position;
                    };
                }
            }
        }
        return;
    }
    
    removeActor(actor) {
        if (this.actors.indexOf(actor) >= 0) {
            this.actors.splice(this.actors.indexOf(actor), 1);
        }
    }
    
    noMoreActors(type) {
        return !this.actors.some((el) => el.type == type);
    }

    playerTouched(type, actor) {
        if (this.status === null) {
            if (type === 'lava' || type === 'fireball') this.status = 'lost';
            if (type === 'coin' && actor) {
                this.removeActor(actor);
                if (!(this.actors.some( el => el.type === 'coin' ))) this.status = 'won';
            }
        }
    }
}

class LevelParser {
    constructor(symbolDict) {
        this.symbolDict = symbolDict;
    }

    actorFromSymbol(sym) {
        if (sym === undefined) return undefined;
        return this.symbolDict[sym];
    }

    obstacleFromSymbol(sym) {
        if (sym === 'x') {
            return 'wall'
        }
        if (sym === '!') {
            return 'lava'
        }
    }

    createGrid(plan) {
        let grid = [];
        while (grid.length < plan.length) {
            grid.push([])};
        for (let y = 0; y < plan.length; y++) {
            for (let x = 0; x < plan[y].length; x++) {
                grid[y][x] = this.obstacleFromSymbol(plan[y][x])
            }
        }
        return grid;
    }

    createActors(plan) {
        if (plan.length === 0 || this.symbolDict === undefined) {return []};
        let actors = [], actor, sym, actorClass;
        for (let y = 0; y < plan.length; y++) {
            for (let x = 0; x < plan[y].length; x++) {
                sym = plan [y][x];
                actorClass = this.actorFromSymbol(sym);
                if (typeof(actorClass) === 'function') {
                    actor = new actorClass(new Vector(x, y));
                    if (actor instanceof Actor) actors.push(actor);
                }
            }
        }
        return actors;
    }

    parse(plan) {
        return new Level(this.createGrid(plan), this.createActors(plan));
    }
}

class Fireball extends Actor {
    constructor(pos = new Vector(-3, 4), speed = new Vector(0, 0)) {
        super(pos);
        this.speed = speed;
        this.size = new Vector(1, 1);
    }
    
    get type() {
        return 'fireball';
    }
    
    getNextPosition(time = 1) {
        return new Vector(this.pos.x + this.speed.x * time, this.pos.y + this.speed.y * time);
    }
    
    handleObstacle() {
        this.speed.x = -this.speed.x;
        this.speed.y = -this.speed.y;
        return this.speed;
    }
    
    act(time, level) {
        if (!level.obstacleAt(this.getNextPosition(time), this.size)) {
            this.pos = this.getNextPosition(time);
        } else {
            this.handleObstacle();
        }
    }
}

class HorizontalFireball extends Fireball {
    constructor(pos, size) {
        super(pos, size);
        this.speed = new Vector(2, 0);
    }
}

class VerticalFireball extends Fireball {
    constructor(pos, size) {
        super(pos, size);
        this.speed = new Vector(0, 2);
    }
}

class FireRain extends Fireball {
    constructor(pos, size) {
        super(pos, size);
        this.speed = new Vector(0, 3);
        this.startPos = pos;
    }
    handleObstacle() {
        this.pos = this.startPos;
    }
}

class Coin extends Actor {
    constructor(pos = new Vector(0, 0)) {
        super();
        this.speed = new Vector(0, 0);
        this.size = new Vector(0.6, 0.6);
        this.startPos = pos.plus(new Vector(0.2, 0.1));
        this.pos = pos.plus(new Vector(0.2, 0.1));
        this.springSpeed = 8;
        this.springDist = 0.07;
        this.spring = Math.random() * 2 * Math.PI;
    }
    
    get type() {
        return 'coin';
    }
    
    updateSpring(time = 1) {
        this.spring += this.springSpeed * time;
    }
    
    getSpringVector() {
        return new Vector(0, Math.sin(this.spring) * this.springDist)
    }
    
    getNextPosition(time = 1) {
        this.updateSpring(time);
        return this.startPos.plus(this.getSpringVector())
    }
    
    act(time = 1) {
        this.pos = this.getNextPosition(time);
    }
}

class Player extends Actor {
    constructor(pos = new Vector(0, 0)) {
        super();
        this.speed = new Vector(0, 0);
        this.size = new Vector(0.8, 1.5);
        this.pos = pos.plus(new Vector(0, -0.5));
    }
    
    get type() {
        return 'player';
    }
}

const schemas = [
    [   '            ',
        '        oooo',
        '         xxx',
        '    =       ',
        '     ooo    ',
        '     xxxx   ',
        ' @          ',
        'xxxx!!!!!!!!',
        '            '
    ],
    [
        '        v    ',
        '    v        ',
        '             ',
        '    o o o    ',
        '  o o      x ',
        '@     x      ',
        'xxx          ',
        '!!!!!!!!!!!!!'
    ]
];

const actorDict = {
    '@': Player,
    'v': FireRain,
    '=': HorizontalFireball,
    'o': Coin
}

const parser = new LevelParser(actorDict);
runGame(schemas, parser, DOMDisplay)
    .then(() => console.log('Вы выиграли приз!'));
