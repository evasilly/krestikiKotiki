--create trigger TWins on  AspNetUsers 
--after update 
--as declare @Wins int
--select @Wins=Wins from updated 
--BEGIN 
--update AspNetUsers set Wins= Wins + 1 
--END

select * from AspNetUsers 