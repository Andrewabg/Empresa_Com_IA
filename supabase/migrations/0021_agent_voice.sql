

alter table public.agents add column voice text;



update public.agents set voice = 'coral' where id = 'copywriter';      
update public.agents set voice = 'ash'   where id = 'designer';        
update public.agents set voice = 'verse' where id = 'gestor-trafego';  
update public.agents set voice = 'echo'  where id = 'coo';             
