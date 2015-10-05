var parse = require('xml-parser');
var render = require('xml-render');
var fmt = require('util').format;
var h = require('hyperscript');
var inherits = require('util').inherits;
var EventEmitter = require('events').EventEmitter;

module.exports = Viewer;
inherits(Viewer, EventEmitter);

function Viewer(xml){
  EventEmitter.call(this);
  if (typeof xml != 'string') xml = xml.toString();
  var obj = parse(xml);
  this._el = this._renderRoot(obj);
  this._selection = null;
}

Viewer.prototype.appendTo = function(el){
  var self = this;
  el.appendChild(this._el);
  el.addEventListener('click', function(ev){
    if (ev.target == el) self._setSelection(null);
  });
};

Viewer.prototype._setSelection = function(node){
  if (this._selection === node) return;

  if (this._selection) this._selection.el.classList.remove('selected');
  if (node) node.el.classList.add('selected');

  this._selection = node;
  this.emit('select', this._selection);
};

Viewer.prototype.getSelection = function(){
  return this._selection;
};

Viewer.prototype._renderRoot = function(node){
  var self = this;

  function onclick(ev){
    ev.stopPropagation();
    self._setSelection(node);
  }

  node.text = function(){
    return render.declaration({
          name: 'xml',
          attributes: node.declaration.attributes
        }) + '\n'
      + node.root.text();
  };

  var el = h('span',
    { onclick: onclick },
    spaces(2),
    render.tagOpen({
      name: 'xml',
      attributes: node.declaration.attributes
    }, true),
    this._renderNode(node.root)
  );
  node.el = el;

  return el;
};

Viewer.prototype._renderNode = function(node, indent){
  var self = this;
  var folded = false;
  indent = indent || 0;

  if (!node.children || !node.children.length) return this._renderLeaf(node, indent);

  function onclick(ev){
    ev.stopPropagation();
    self._setSelection(node);
  }

  function ontoggle(ev){
    ev.stopPropagation();
    if (folded) {
      ev.target.innerHTML = '-';
      node.children.forEach(function(child){
        child.el.style.display = 'inline';
      });
    } else {
      ev.target.innerHTML = '+';
      node.children.forEach(function(child){
        child.el.style.display = 'none';
      });
    }
    folded = !folded;
  }

  node.text = function(){
    return render.tagOpen(node) + '\n'
      + node.children.map(function(child){
          return child.text().replace(/^/gm, '\t');
        }).join('\n') + '\n'
      + render.tagClose(node);
  };

  var el = h('span',
    { onclick: onclick },
    h('br'),
    tabs(indent),
    h('span', { onclick: ontoggle }, '-'),
    spaces(1),
    render.tagOpen(node),
    node.children.map(function(child){
      return self._renderNode(child, indent + 1);
    }),
    h('br'),
    tabs(indent),
    spaces(2),
    render.tagClose(node)
  );
  node.el = el;

  return el;
}

Viewer.prototype._renderLeaf = function(node, indent){
  var self = this;

  function onclick(ev){
    ev.stopPropagation();
    self._setSelection(node);
  }

  node.text = function(){
    return render.leaf(node);
  };

  var el = h('span',
    { onclick: onclick },
    h('br'),
    tabs(indent),
    spaces(2),
    text
  );
  node.el = el;

  return el;
}

function tabs(n){
  var out = [];
  for (var i = 0; i < n; i++) out.push(spaces(4));
  return out;
}

function spaces(n){
  var el = document.createElement('span');
  for (var i = 0; i < n; i++) {
    el.innerHTML += '&nbsp';
  }
  return el;
}
