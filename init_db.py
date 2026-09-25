import sqlite3

conn = sqlite3.connect('database.db')
cursor = conn.cursor()

cursor.execute('''
CREATE TABLE IF NOT EXISTS movies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    year INTEGER NOT NULL,
    genre TEXT NOT NULL
)
''')

# Hand-crafted data (15 items)
initial_movies = [
    ('The Shawshank Redemption', 1994, 'Drama'),
    ('The Godfather', 1972, 'Crime'),
    ('The Dark Knight', 2008, 'Action'),
    ('Pulp Fiction', 1994, 'Crime'),
    ('Inception', 2010, 'Sci-Fi'),
    ('Fight Club', 1999, 'Drama'),
    ('Forrest Gump', 1994, 'Drama'),
    ('The Matrix', 1999, 'Sci-Fi'),
    ('Goodfellas', 1990, 'Crime'),
    ('Interstellar', 2014, 'Sci-Fi'),
    ('Spirited Away', 2001, 'Animation'),
    ('Parasite', 2019, 'Thriller'),
    ('Gladiator', 2000, 'Action'),
    ('Whiplash', 2014, 'Drama'),
    ('The Prestige', 2006, 'Mystery')
]

cursor.executemany('INSERT INTO movies (title, year, genre) VALUES (?, ?, ?)', initial_movies)
conn.commit()
conn.close()
print("Database successfully initialized with 15 records.")