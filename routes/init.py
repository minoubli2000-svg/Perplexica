from .document_routes import core_bp, documents_bp, library_bp

def register_blueprints(app):
    app.register_blueprint(core_bp)
    app.register_blueprint(documents_bp)
    app.register_blueprint(library_bp)
