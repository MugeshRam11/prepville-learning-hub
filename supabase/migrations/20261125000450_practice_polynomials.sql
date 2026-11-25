create schema if not exists practice_private;
revoke all on schema practice_private from public,anon,authenticated;
-- Exact comparison for sums of integer monomials in x. Unsupported notation is sent to a reviewer.
create function practice_private.polynomial(raw text) returns jsonb language plpgsql immutable strict set search_path='' as $$
declare expr text:=trim(raw); term text; coefficient numeric; degree integer; coefficients jsonb:='{}';
begin
 if left(expr,1)='$' and right(expr,1)='$' then expr:=substr(expr,2,length(expr)-2); end if;
 if length(expr)>512 or expr ~ '[0-9][[:space:]]+[0-9]' then return null; end if;
 expr:=regexp_replace(expr,'[[:space:]]','','g');
 expr:=regexp_replace(expr,'\^\{([0-9]{1,2})\}','^\1','g');
 if expr !~ '^[+-]?([0-9]{1,16}|[0-9]{0,16}x(\^[0-9]{1,2})?)([+-]([0-9]{1,16}|[0-9]{0,16}x(\^[0-9]{1,2})?))*$' then return null; end if;
 for term in select m[1] from regexp_matches(expr,'([+-]?[^+-]+)','g') m loop
   if position('x' in term)=0 then coefficient:=term::numeric; degree:=0;
   else
     coefficient:=case split_part(term,'x',1) when '' then 1 when '+' then 1 when '-' then -1 else split_part(term,'x',1)::numeric end;
     degree:=coalesce(nullif(split_part(term,'^',2),'')::integer,1);
   end if;
   coefficient:=coefficient+coalesce((coefficients->>degree::text)::numeric,0);
   if coefficient=0 then coefficients:=coefficients-degree::text;
   else coefficients:=jsonb_set(coefficients,array[degree::text],to_jsonb(coefficient)); end if;
 end loop;
 return coefficients;
end $$;
