FROM php:8.3-apache

RUN apt-get update \
 && apt-get install -y --no-install-recommends libfreetype6-dev libjpeg62-turbo-dev libpng-dev libwebp-dev \
 && docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
 && docker-php-ext-install -j"$(nproc)" gd exif \
 && a2enmod headers \
 && sed -i 's/AllowOverride None/AllowOverride All/' /etc/apache2/apache2.conf \
 && rm -rf /var/lib/apt/lists/*

RUN printf 'upload_max_filesize=6M\npost_max_size=8M\nmemory_limit=512M\n' > /usr/local/etc/php/conf.d/mailstudio.ini

COPY api /var/www/html/api
RUN mkdir -p /var/www/html/api/cache /var/www/html/api/data/docs /var/www/html/uploads \
 && printf '<FilesMatch "\\.(php|phtml|php[0-9]|pl|py|cgi|sh)$">\n  Require all denied\n</FilesMatch>\nOptions -Indexes\n' > /var/www/html/uploads/.htaccess \
 && printf 'Require all denied\n' > /var/www/html/api/cache/.htaccess \
 && printf 'Require all denied\n' > /var/www/html/api/data/.htaccess \
 && chown -R www-data:www-data /var/www/html
