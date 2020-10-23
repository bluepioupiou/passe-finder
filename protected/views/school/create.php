<?php
$this->breadcrumbs=array(
	'Ecoles'=>array('index'),
	'Créer',
);

$this->menu=array(
	array('label'=>'List School', 'url'=>array('index')),
	array('label'=>'Manage School', 'url'=>array('admin')),
);
?>

<h2>Inscrire une école</h2>
<span class="alert i_info">Cette action enverra à l'administrateur une demande qu'il devra valider pour que l'école
apparaisse sur le site.<br/>
Lorsque vous inscrivez une école, vous en devenez le gestionnaire et pouvez
créer des cours et désigner des professeurs</span>



<?php echo $this->renderPartial('_form', array('model'=>$model)); ?>