require 'json'
GEO = ARGV[0]; OUT = ARGV[1]
LON0, LON1, LAT0, LAT1, K = -18.0, 54.0, 38.5, -36.0, 10.0
def pt(lon, lat); [((lon - LON0) * K).round(1), ((LAT0 - lat) * K).round(1)]; end
def inview?(ring); ring.any? { |lon, lat| lon > LON0-3 && lon < LON1+3 && lat < LAT0+3 && lat > LAT1-3 }; end
def simplify(pts, tol)
  out = [pts.first]
  pts[1..-1].each { |p| l = out.last; out << p if Math.hypot(p[0]-l[0], p[1]-l[1]) >= tol }
  out << pts.last if out.last != pts.last
  out
end
def ringpath(ring, close, tol)
  ps = simplify(ring.map { |lon, lat| pt(lon, lat) }, tol)
  return '' if ps.size < (close ? 4 : 2)
  'M' + ps.map { |x, y| "#{x} #{y}" }.join('L') + (close ? 'Z' : '')
end
def polys(g); g['type'] == 'Polygon' ? [g['coordinates']] : g['coordinates']; end
def lines(g); g['type'] == 'LineString' ? [g['coordinates']] : g['coordinates']; end

out = { countries: [], rivers: [], lakes: [] }
JSON.parse(File.read("#{GEO}/ne_50m_admin_0_countries.json"))['features'].each do |f|
  pr = f['properties']; d = ''
  polys(f['geometry']).each { |poly| ring = poly[0]; next unless inview?(ring); next if ring.size < 4; d << ringpath(ring, true, 1.4) }
  next if d.empty?
  out[:countries] << { iso: pr['ADM0_A3'], name: pr['NAME'], africa: pr['CONTINENT'] == 'Africa', d: d }
end
keep = /^(Nile|White Nile|Blue Nile|Albert Nile|Victoria Nile|Zambezi|Okavango|Limpopo|Olifants|Rufiji|Luangwa|Kafue|Shire|Congo|Lualaba|Niger|Orange|Cuando|Chobe|Ruvuma|Omo|Tana|Jubba|Shebelle|Kagera|Save|Sobat|Ubangi|Kasai|Senegal|Volta|Gambia|Pongola)/i
JSON.parse(File.read("#{GEO}/ne_50m_rivers_lake_centerlines.json"))['features'].each do |f|
  n = f['properties']['name'].to_s
  next unless n =~ keep
  d = ''
  lines(f['geometry']).each { |l| next unless inview?(l); d << ringpath(l, false, 1.0) }
  out[:rivers] << { name: n, d: d } unless d.empty?
end
JSON.parse(File.read("#{GEO}/ne_50m_lakes.json"))['features'].each do |f|
  d = ''
  polys(f['geometry']).each { |poly| next unless inview?(poly[0]); d << ringpath(poly[0], true, 0.8) }
  out[:lakes] << { name: f['properties']['name'].to_s, d: d } unless d.empty?
end
File.write(OUT, JSON.generate(out))
puts "countries #{out[:countries].size} rivers #{out[:rivers].map{|r| r[:name]}.uniq.join(', ')} lakes #{out[:lakes].map{|r| r[:name]}.join(', ')}"
puts "bytes #{File.size(OUT)}"
