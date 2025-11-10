FROM python:3.10-slim

# Crée l'utilisateur
RUN useradd -ms /bin/bash perplexica

WORKDIR /home/perplexica

# Copie le code source Perplexica à ce dossier (adapter si tu as un dossier "src" ou autre)
COPY . /home/perplexica/

# Copie config TOML (ex: ton fichier local)
COPY config.toml /home/perplexica/config.toml

# Installe les dépendances
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# Expose le port API
EXPOSE 3003

# Commande de lancement
CMD ["python", "app.py"]
