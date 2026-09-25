from flask import Flask, request, jsonify
import sqlite3

app = Flask(__name__)

def get_db_connection():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

# GET /movies - Retrieve all items (200 OK)
@app.route('/movies', methods=['GET'])
def get_movies():
    conn = get_db_connection()
    movies = conn.execute('SELECT * FROM movies').fetchall()
    conn.close()
    return jsonify([dict(movie) for movie in movies]), 200

# GET /movies/<id> - Retrieve single item (200 OK or 404 Not Found)
@app.route('/movies/<int:id>', methods=['GET'])
def get_movie(id):
    conn = get_db_connection()
    movie = conn.execute('SELECT * FROM movies WHERE id = ?', (id,)).fetchone()
    conn.close()
    if movie is None:
        return jsonify({'error': f'Movie with ID {id} not found'}), 404
    return jsonify(dict(movie)), 200

# POST /movies - Create new item (201 Created or 400 Bad Request)
@app.route('/movies', methods=['POST'])
def create_movie():
    data = request.get_json() or {}
    for field in ['title', 'year', 'genre']:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('INSERT INTO movies (title, year, genre) VALUES (?, ?, ?)',
                   (data['title'], data['year'], data['genre']))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return jsonify({'id': new_id, 'title': data['title'], 'year': data['year'], 'genre': data['genre']}), 201

# PUT /movies/<id> - Update item (200 OK, 400 Bad Request, or 404 Not Found)
@app.route('/movies/<int:id>', methods=['PUT'])
def update_movie(id):
    data = request.get_json() or {}
    for field in ['title', 'year', 'genre']:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400

    conn = get_db_connection()
    movie = conn.execute('SELECT * FROM movies WHERE id = ?', (id,)).fetchone()
    if movie is None:
        conn.close()
        return jsonify({'error': f'Movie with ID {id} not found'}), 404

    conn.execute('UPDATE movies SET title = ?, year = ?, genre = ? WHERE id = ?',
                 (data['title'], data['year'], data['genre'], id))
    conn.commit()
    conn.close()
    return jsonify({'id': id, 'title': data['title'], 'year': data['year'], 'genre': data['genre']}), 200

# DELETE /movies/<id> - Remove item (200 OK or 404 Not Found)
@app.route('/movies/<int:id>', methods=['DELETE'])
def delete_movie(id):
    conn = get_db_connection()
    movie = conn.execute('SELECT * FROM movies WHERE id = ?', (id,)).fetchone()
    if movie is None:
        conn.close()
        return jsonify({'error': f'Movie with ID {id} not found'}), 404

    conn.execute('DELETE FROM movies WHERE id = ?', (id,))
    conn.commit()
    conn.close()
    return jsonify({'message': f'Movie with ID {id} deleted successfully'}), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)