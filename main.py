
from flask import Flask, redirect, render_template
app = Flask(__name__)

@app.route('/convert')
def calendar():
    return redirect("https://projectassessment.app/convert/")

@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404


@app.errorhandler(500)
def server_error(e):
    return render_template('500.html'), 500


@app.errorhandler(Exception)
def unhandled_exception(e):
    return render_template('500.html'), 500


if __name__ == '__main__':
    # This is used when running locally only. When deploying to Google App
    # Engine, a webserver process such as Gunicorn will serve the app. This
    # can be configured by adding an `entrypoint` to app.yaml.
    app.run(host='127.0.0.1', port=8080, debug=True)