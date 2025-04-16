from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/tree')
def tree():
    return render_template('tree.html')

@app.route('/counselor')
def counselor():
    return render_template('counselor.html')

if __name__ == '__main__':
    app.run(debug=True) 