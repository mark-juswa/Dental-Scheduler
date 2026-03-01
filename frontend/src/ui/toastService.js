// toastService.js

let _addToast = null;

export function registerToast(fn) {
  _addToast = fn;
}

export function unregisterToast() {
  _addToast = null;
}

export function showToast(msg, type = 'success') {
  if (_addToast) _addToast(msg, type);
}